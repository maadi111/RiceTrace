/**
 * @file apps/api/src/services/compliance.service.ts
 * @description Compliance score calculation engine for RiceTrace.
 * Evaluates a shipment against EUDR, SPS, and traceability requirements
 * and produces a 0–100 score with a detailed checklist.
 *
 * Score weights per the spec:
 *   +20 pts: All farms have GPS coordinates
 *   +25 pts: All farms have EUDR LOW risk
 *   +35 pts: All batches have passing pesticide lab test
 *   +10 pts: All lots have pesticide declaration
 *   +10 pts: Due diligence statement confirmed
 *   Total possible: 100
 */

import { prisma } from "@ricetrace/db";
import type {
  ComplianceCheckResult,
  CheckItem,
  ComplianceStatus,
} from "@ricetrace/types";

/**
 * Computes the compliance score for a shipment by traversing the full
 * traceability chain: shipment → items → batches → lots → farms.
 *
 * Persists the result back to the DB and returns the full breakdown.
 */
export async function calculateComplianceScore(
  shipmentId: string
): Promise<ComplianceCheckResult> {
  // Fetch the shipment with the full traceability chain in one query
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      items: {
        include: {
          millingBatch: {
            include: {
              labTests: {
                where: { overallResult: { not: "FAIL" } },
                select: { testType: true, overallResult: true, testDate: true },
              },
              lotLinks: {
                include: {
                  procurementLot: {
                    include: {
                      farm: {
                        select: {
                          id: true,
                          geoLat: true,
                          geoLng: true,
                          eudrRiskLevel: true,
                        },
                      },
                      pesticidesUsed: { select: { id: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);

  const checks: CheckItem[] = [];
  let score = 0;

  // Extract the full chain
  const batches = shipment.items.map((i) => i.millingBatch);
  const allLots = batches.flatMap((b) =>
    b.lotLinks.map((l) => l.procurementLot)
  );
  // Deduplicate farms (a farm may supply multiple lots)
  const farmMap = new Map(
    allLots.map((l) => [l.farm.id, l.farm])
  );
  const farms = Array.from(farmMap.values());

  // ── CHECK 1: GPS Coverage ─────────────────────────────────────────────────
  const farmsWithoutGps = farms.filter(
    (f) => f.geoLat === null || f.geoLng === null
  );
  const gpsPass = farmsWithoutGps.length === 0;

  const gpsCheck: CheckItem = {
    id: "gps_coverage",
    category: "TRACEABILITY",
    label: "All farms have GPS coordinates",
    passed: gpsPass,
    points: 20,
    ...(gpsPass
      ? {}
      : {
          detail: `${farmsWithoutGps.length} of ${farms.length} farm(s) missing GPS`,
        }),
  };
  checks.push(gpsCheck);
  if (gpsPass) score += 20;

  // ── CHECK 2: EUDR Risk ────────────────────────────────────────────────────
  const highRiskFarms = farms.filter((f) => f.eudrRiskLevel === "HIGH");
  const eudrPass = highRiskFarms.length === 0;

  checks.push({
    id: "eudr_risk",
    category: "EUDR",
    label: "No high deforestation risk farms",
    passed: eudrPass,
    points: 25,
    ...(eudrPass
      ? {}
      : { detail: `${highRiskFarms.length} farm(s) flagged as HIGH EUDR risk` }),
  });
  if (eudrPass) score += 25;

  // ── CHECK 3: Pesticide Lab Test (PASS) ───────────────────────────────────
  const batchesWithPassingTest = batches.filter((b) =>
    b.labTests.some(
      (t) =>
        t.testType === "PESTICIDE_RESIDUE" &&
        (t.overallResult === "PASS" || t.overallResult === "CONDITIONAL")
    )
  );
  const labPass = batchesWithPassingTest.length === batches.length && batches.length > 0;

  checks.push({
    id: "lab_pesticide",
    category: "SPS",
    label: "All batches have a passing pesticide residue test",
    passed: labPass,
    points: 35,
    ...(labPass
      ? {}
      : {
          detail:
            batches.length === 0
              ? "No milling batches linked to this shipment"
              : `${batches.length - batchesWithPassingTest.length} batch(es) missing a passing pesticide test`,
        }),
  });
  if (labPass) score += 35;

  // ── CHECK 4: Pesticide Declaration ───────────────────────────────────────
  const lotsWithDeclaration = allLots.filter(
    (l) => l.pesticidesUsed.length > 0 || l.noPesticidesFlag
  );
  const declPass =
    lotsWithDeclaration.length === allLots.length && allLots.length > 0;

  checks.push({
    id: "pesticide_declaration",
    category: "SPS",
    label: "All lots have a pesticide declaration",
    passed: declPass,
    points: 10,
    ...(declPass
      ? {}
      : {
          detail: `${allLots.length - lotsWithDeclaration.length} lot(s) missing pesticide declaration`,
        }),
  });
  if (declPass) score += 10;

  // ── CHECK 5: EUDR Due Diligence Statement ─────────────────────────────────
  const dueDiligencePass = shipment.dueDiligenceConfirmed;

  checks.push({
    id: "due_diligence",
    category: "EUDR",
    label: "Operator due diligence statement confirmed",
    passed: dueDiligencePass,
    points: 10,
    ...(dueDiligencePass
      ? {}
      : { detail: "Export manager must confirm the EUDR due diligence statement" }),
  });
  if (dueDiligencePass) score += 10;

  // ── DETERMINE STATUS ──────────────────────────────────────────────────────
  let status: ComplianceStatus;
  if (!eudrPass || !labPass) {
    status = "AT_RISK";
  } else if (score < 60) {
    status = "INCOMPLETE";
  } else if (score === 100) {
    status = "COMPLIANT";
  } else if (score >= 60 && eudrPass && labPass) {
    // Partially complete but no blocking issues
    status = "COMPLIANT";
  } else {
    status = "INCOMPLETE";
  }

  // Persist result to DB
  await prisma.shipment.update({
    where: { id: shipmentId },
    data: { complianceScore: score, complianceStatus: status },
  });

  return { score, status, checks };
}
