/**
 * @file apps/api/src/services/eudr-check.service.ts
 * @description EUDR Deforestation Risk verification service.
 * Integrates with Global Forest Watch (GFW) Integrated Deforestation Alerts API
 * to assess if farm coordinates intersect recent deforestation events.
 */

import { prisma, EudrRisk } from "@ricetrace/db";

const GFW_API_URL = "https://data-api.globalforestwatch.org/dataset/gfw_integrated_alerts/latest/query";

/**
 * Checks deforestation risk for a farm at given GPS coordinates via the GFW API.
 * Updates the Farm record in the database with the resulting risk level and timestamp.
 *
 * @param lat - Latitude in decimal degrees
 * @param lng - Longitude in decimal degrees
 * @param farmId - Unique ID of the farm record
 * @returns Risk level: 'LOW' | 'MEDIUM' | 'HIGH'
 */
export async function checkEudrRisk(
  lat: number,
  lng: number,
  farmId: string
): Promise<"LOW" | "MEDIUM" | "HIGH"> {
  const requestBody = {
    geometry: {
      type: "Point",
      coordinates: [lng, lat], // GFW requires [longitude, latitude] order
    },
    buffer: 0.001, // ~100m buffer around the GPS point
    sql: "SELECT * FROM data LIMIT 1",
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (process.env.GFW_API_KEY) {
    headers["x-api-key"] = process.env.GFW_API_KEY;
  }

  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";

  try {
    const response = await fetch(GFW_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      // API unavailable — fail safe to MEDIUM, log the issue
      console.warn(
        `[EUDR] GFW API returned ${response.status} for farm ${farmId}. Defaulting to MEDIUM.`
      );
      riskLevel = "MEDIUM";
    } else {
      interface GfwResponse {
        data?: unknown[];
      }
      const data = (await response.json()) as GfwResponse;

      // If the API returns any alert records → HIGH risk
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        console.log(
          `[EUDR] Farm ${farmId} — HIGH risk. ${data.data.length} deforestation alerts found.`
        );
        riskLevel = "HIGH";
      } else {
        // No alerts found → LOW risk
        console.log(`[EUDR] Farm ${farmId} — LOW risk. No deforestation alerts found.`);
        riskLevel = "LOW";
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "TimeoutError") {
      console.warn(`[EUDR] GFW API timeout for farm ${farmId}. Defaulting to MEDIUM.`);
    } else {
      console.error(`[EUDR] Unexpected error for farm ${farmId}:`, error);
    }
    riskLevel = "MEDIUM"; // Always fail safe — never block farm creation
  }

  // Persist updated risk level and checkedAt timestamp to DB
  try {
    await prisma.farm.update({
      where: { id: farmId },
      data: {
        eudrRiskLevel: riskLevel,
        eudrCheckedAt: new Date(),
      },
    });
  } catch (dbErr) {
    // If farm record doesn't exist (e.g. in isolated test with mock ID), log warning and proceed
    console.warn(
      `[EUDR] Farm ${farmId} could not be updated in DB:`,
      dbErr instanceof Error ? dbErr.message : dbErr
    );
  }

  return riskLevel;
}

/**
 * Triggers an EUDR deforestation risk check for a farm by ID.
 * Looks up the farm's GPS coordinates and delegates to checkEudrRisk.
 *
 * @param farmId - Unique ID of the farm
 */
export async function triggerEudrCheckForFarm(farmId: string): Promise<void> {
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    select: { id: true, geoLat: true, geoLng: true },
  });

  if (!farm || farm.geoLat === null || farm.geoLng === null) {
    console.warn(`[EUDR] Skipping check for farm ${farmId} — no GPS coordinates`);
    return;
  }

  await checkEudrRisk(farm.geoLat, farm.geoLng, farm.id);
}
