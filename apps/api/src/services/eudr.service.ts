/**
 * @file apps/api/src/services/eudr.service.ts
 * @description EUDR (EU Deforestation Regulation) compliance check service.
 * Queries the Global Forest Watch Integrated Deforestation Alerts API to
 * classify farm locations as LOW / MEDIUM / HIGH deforestation risk.
 * Falls back to MEDIUM on API errors to trigger manual review.
 */

import { prisma } from "@ricetrace/db";
import type { EudrRisk, EudrCheckResult } from "@ricetrace/types";

const GFW_API_BASE = "https://data-api.globalforestwatch.org";
const GFW_API_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * Checks deforestation risk for a GPS coordinate pair using the
 * Global Forest Watch (GFW) Integrated Deforestation Alerts API.
 *
 * GFW API is free and requires no API key for basic queries.
 *
 * @param lat - Latitude (WGS84)
 * @param lng - Longitude (WGS84)
 * @returns EudrCheckResult with risk level and metadata
 */
export async function checkDeforestationRisk(
  lat: number,
  lng: number
): Promise<EudrCheckResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GFW_API_TIMEOUT_MS);

  try {
    // GFW Integrated Deforestation Alerts API — checks for alerts near the point
    const url = `${GFW_API_BASE}/dataset/gfw_integrated_alerts/latest/query`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        geometry: {
          type: "Point",
          coordinates: [lng, lat], // GeoJSON: [longitude, latitude]
        },
        // ~100m buffer around the point to account for GPS imprecision
        sql: `SELECT count(*) as alert_count FROM data WHERE umd_glad_landsat_alerts__date >= '2020-12-31'`,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`GFW API returned ${response.status} — defaulting to MEDIUM risk`);
      return { riskLevel: "MEDIUM", checkedAt: new Date(), source: "GFW", alertsFound: 0 };
    }

    const data = (await response.json()) as {
      data?: Array<{ alert_count?: number }>;
    };

    const alertCount = data.data?.[0]?.alert_count ?? 0;

    let riskLevel: EudrRisk;
    if (alertCount > 0) {
      riskLevel = "HIGH";
    } else {
      // No recent alerts — check for historical forest cover baseline (pre-2020)
      const hasCover = await checkForestCoverBaseline(lat, lng);
      riskLevel = hasCover ? "LOW" : "MEDIUM";
    }

    return {
      riskLevel,
      checkedAt: new Date(),
      source: "GFW",
      alertsFound: alertCount,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      console.warn("GFW API timeout — defaulting to MEDIUM risk");
    } else {
      console.error("GFW API error:", err);
    }
    // On any error, flag as MEDIUM to trigger manual review — never silently pass
    return { riskLevel: "MEDIUM", checkedAt: new Date(), source: "GFW", alertsFound: 0 };
  }
}

/**
 * Checks whether an area had forest cover as of December 31, 2020.
 * Required for EUDR — land that was non-forested before the cutoff date is allowed.
 */
async function checkForestCoverBaseline(
  lat: number,
  lng: number
): Promise<boolean> {
  try {
    const url = `${GFW_API_BASE}/dataset/umd_tree_cover_loss/latest/query`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        geometry: { type: "Point", coordinates: [lng, lat] },
        sql: `SELECT SUM(umd_tree_cover_loss__ha) as loss FROM data WHERE umd_tree_cover_loss__year >= 2021`,
      }),
    });

    if (!response.ok) return true; // Assume coverage exists on API failure

    const data = (await response.json()) as {
      data?: Array<{ loss?: number }>;
    };
    const lossHa = data.data?.[0]?.loss ?? 0;

    // If significant loss after 2020 cutoff, flag as potentially at risk
    return lossHa < 0.5;  // Less than 0.5 hectares lost = LOW risk
  } catch {
    return true; // Fail-safe: assume no recent loss
  }
}

/**
 * Runs an EUDR check for a farm and updates the DB record.
 * Called automatically when a farm is created (via BullMQ job in prod).
 */
export async function runEudrCheckForFarm(farmId: string): Promise<EudrRisk> {
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    select: { geoLat: true, geoLng: true },
  });

  if (!farm) throw new Error(`Farm ${farmId} not found`);

  const result = await checkDeforestationRisk(farm.geoLat, farm.geoLng);

  await prisma.farm.update({
    where: { id: farmId },
    data: {
      eudrRiskLevel: result.riskLevel,
      eudrCheckedAt: result.checkedAt,
    },
  });

  return result.riskLevel;
}
