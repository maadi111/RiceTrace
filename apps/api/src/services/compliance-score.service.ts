/**
 * @file apps/api/src/services/compliance-score.service.ts
 * @description Single source of truth for shipment compliance calculations in RiceTrace.
 * Evaluates GPS coverage, EUDR deforestation risk, pesticide lab tests,
 * pesticide declarations, and operator due diligence statements.
 */

import { prisma, Prisma } from "@ricetrace/db";

export type CheckCategory = "EUDR" | "SPS" | "TRACEABILITY";

export interface CheckItem {
  id: string;
  category: CheckCategory;
  label: string;
  passed: boolean;
  points: number;
  detail: string | null;
}

export interface ComplianceResult {
  score: number;
  status: "COMPLIANT" | "AT_RISK" | "INCOMPLETE";
  checks: CheckItem[];
}

/**
 * Calculates the complete compliance score and checklist for a given shipment,
 * updates the shipment record in PostgreSQL with the new score and status,
 * and returns the detailed result.
 *
 * @param shipmentId - Unique ID of the shipment
 * @param organizationId - ID of the owning organization (multi-tenant scope)
 * @returns ComplianceResult with computed score, status, and individual check items
 */
export async function calculateComplianceScore(
  shipmentId: string,
  organizationId: string
): Promise<ComplianceResult> {
  // Step 1 — Fetch shipment with complete traceability chain
  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, organizationId },
    include: {
      items: {
        include: {
          millingBatch: {
            include: {
              labTests: true,
              lotLinks: {
                include: {
                  procurementLot: {
                    include: {
                      farm: true,
                      pesticidesUsed: true,
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

  if (!shipment) {
    throw new Error("SHIPMENT_NOT_FOUND");
  }

  // Step 2 — Guard against empty shipments without milling batches
  const batches = shipment.items.map((i) => i.millingBatch);
  if (batches.length === 0) {
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { complianceScore: 0, complianceStatus: "INCOMPLETE" },
    });
    return {
      score: 0,
      status: "INCOMPLETE",
      checks: [
        {
          id: "no_batches",
          category: "TRACEABILITY",
          label: "No milling batches added to shipment",
          passed: false,
          points: 100,
          detail: "Add at least one milling batch to calculate compliance",
        },
      ],
    };
  }

  const lots = batches.flatMap((b) =>
    b.lotLinks.map((link) => link.procurementLot)
  );

  // Deduplicate farms by id — a farm may appear via multiple lots
  type FarmType = (typeof lots)[number]["farm"];
  const farmMap = new Map<string, FarmType>();
  lots.forEach((lot) => {
    if (lot.farm) {
      farmMap.set(lot.farm.id, lot.farm);
    }
  });
  const farms = Array.from(farmMap.values());

  // Step 3 — Run all 5 checks and accumulate score
  let score = 0;
  const checks: CheckItem[] = [];

  // CHECK 1 — GPS Coverage (20 pts)
  const farmsWithoutGPS = farms.filter((f) => !f.geoLat || !f.geoLng);
  const gpsPass = farms.length > 0 && farmsWithoutGPS.length === 0;
  if (gpsPass) score += 20;
  checks.push({
    id: "gps_coverage",
    category: "TRACEABILITY",
    label: "All farms have GPS coordinates recorded",
    passed: gpsPass,
    points: 20,
    detail: gpsPass
      ? null
      : farms.length === 0
        ? "No farms linked to shipment"
        : `${farmsWithoutGPS.length} of ${farms.length} farms are missing GPS coordinates`,
  });

  // CHECK 2 — EUDR Deforestation Risk (25 pts)
  const highRiskFarms = farms.filter((f) => f.eudrRiskLevel === "HIGH");
  const pendingFarms = farms.filter((f) => f.eudrRiskLevel === "PENDING");
  const eudrPass = farms.length > 0 && highRiskFarms.length === 0 && pendingFarms.length === 0;
  if (eudrPass) score += 25;
  checks.push({
    id: "eudr_risk",
    category: "EUDR",
    label: "No high-risk deforestation farms in shipment",
    passed: eudrPass,
    points: 25,
    detail: !eudrPass
      ? farms.length === 0
        ? "No farms linked to shipment"
        : [
            highRiskFarms.length > 0
              ? `${highRiskFarms.length} farms flagged HIGH deforestation risk`
              : null,
            pendingFarms.length > 0
              ? `${pendingFarms.length} farms have not been EUDR-checked yet`
              : null,
          ]
            .filter((d): d is string => Boolean(d))
            .join("; ")
      : null,
  });

  // CHECK 3 — Pesticide Residue Lab Test (35 pts)
  const batchesWithPassingTest = batches.filter((batch) =>
    batch.labTests.some(
      (t) => t.testType === "PESTICIDE_RESIDUE" && t.overallResult === "PASS"
    )
  );
  const labPass = batches.length > 0 && batchesWithPassingTest.length === batches.length;
  if (labPass) score += 35;
  const batchesMissingTest = batches.length - batchesWithPassingTest.length;
  checks.push({
    id: "lab_pesticide",
    category: "SPS",
    label: "All milling batches have a passing pesticide residue test",
    passed: labPass,
    points: 35,
    detail: labPass
      ? null
      : batches.length === 0
        ? "No milling batches in shipment"
        : `${batchesMissingTest} of ${batches.length} batches are missing a passing test`,
  });

  // CHECK 4 — Pesticide Declaration (10 pts)
  const lotsWithDeclaration = lots.filter(
    (lot) => (lot.pesticidesUsed && lot.pesticidesUsed.length > 0) || lot.noPesticidesFlag === true
  );
  const declPass = lots.length > 0 && lotsWithDeclaration.length === lots.length;
  if (declPass) score += 10;
  checks.push({
    id: "pesticide_declaration",
    category: "SPS",
    label: "All procurement lots have a pesticide declaration",
    passed: declPass,
    points: 10,
    detail: declPass
      ? null
      : lots.length === 0
        ? "No procurement lots in shipment"
        : `${lots.length - lotsWithDeclaration.length} lots are missing pesticide declaration`,
  });

  // CHECK 5 — Due Diligence Statement (10 pts)
  const ddPass = shipment.dueDiligenceConfirmed === true;
  if (ddPass) score += 10;
  checks.push({
    id: "due_diligence",
    category: "EUDR",
    label: "Operator due diligence statement confirmed",
    passed: ddPass,
    points: 10,
    detail: ddPass ? null : "Due diligence statement has not been confirmed",
  });

  // Step 4 — Determine status
  let status: ComplianceResult["status"];

  if (highRiskFarms.length > 0 || !labPass) {
    status = "AT_RISK";
  } else if (score >= 60) {
    status = "COMPLIANT";
  } else {
    status = "INCOMPLETE";
  }

  // Step 5 — Persist to DB and return
  await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      complianceScore: score,
      complianceStatus: status,
    },
  });

  return { score, status, checks };
}
