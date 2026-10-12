/**
 * @file apps/api/src/services/sequence.service.ts
 * @description Auto-generates sequential, human-readable reference numbers
 * for procurement lots, milling batches, and shipments.
 * Uses a DB counter table with a transaction to prevent duplicates.
 */

import { prisma } from "@ricetrace/db";

type CounterType = "LOT" | "BATCH" | "SHIPMENT";

/**
 * Atomically increments and returns the next sequence number for a given
 * counter type within an organization for the current year.
 * Uses an upsert + raw update inside a transaction to avoid race conditions.
 *
 * Returns formatted strings like:
 *  - LOT:     "LOT-2024-00042"
 *  - BATCH:   "BATCH-2024-00007"
 *  - SHIPMENT:"SHP-2024-00015"
 */
export async function nextSequenceNumber(
  organizationId: string,
  type: CounterType
): Promise<string> {
  const year = new Date().getFullYear();

  // Upsert the counter row, then increment atomically
  const result = await prisma.$transaction(async (tx) => {
    // Ensure row exists
    await tx.sequenceCounter.upsert({
      where: {
        organizationId_counterType_year: {
          organizationId,
          counterType: type,
          year,
        },
      },
      create: { organizationId, counterType: type, year, lastValue: 0 },
      update: {},
    });

    // Atomic increment (Prisma increment operator)
    const updated = await tx.sequenceCounter.update({
      where: {
        organizationId_counterType_year: {
          organizationId,
          counterType: type,
          year,
        },
      },
      data: { lastValue: { increment: 1 } },
    });

    return updated.lastValue;
  });

  const padded = String(result).padStart(5, "0");

  switch (type) {
    case "LOT":
      return `LOT-${year}-${padded}`;
    case "BATCH":
      return `BATCH-${year}-${padded}`;
    case "SHIPMENT":
      return `SHP-${year}-${padded}`;
  }
}
