/**
 * @file apps/api/src/controllers/dashboard.controller.ts
 * @description Controller for Dashboard and Analytics metrics in RiceTrace.
 * Gathers aggregate KPIs, EUDR status, compliance averages, district breakdown,
 * weekly procurement trends, and recent unified audit activity.
 * All queries are strictly scoped to req.user.organizationId.
 */

import type { Request, Response } from "express";
import { prisma, Prisma } from "@ricetrace/db";

interface ActivityItem {
  type: "LOT_CREATED" | "BATCH_COMPLETED" | "LAB_TEST_ADDED" | "SHIPMENT_CREATED";
  referenceNumber: string;
  createdBy: string;
  createdAt: Date;
}

interface DistrictRow {
  district: string;
  totalKg: number | string;
}

/**
 * GET /dashboard/stats
 * Aggregate dashboard statistics across the organization.
 */
export async function getStats(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const now = new Date();
    const currentYear = now.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    // Compute weekly buckets for the last 8 weeks (starting Monday of each week)
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() + diffToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);

    const weekBuckets: { start: Date; end: Date; weekStart: string; totalKg: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(currentWeekStart);
      start.setDate(currentWeekStart.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      weekBuckets.push({
        start,
        end,
        weekStart: start.toISOString().split("T")[0]!,
        totalKg: 0,
      });
    }
    const earliestWeekStart = weekBuckets[0]!.start;

    // Execute aggregate queries in parallel
    const [
      totalPaddyAgg,
      totalBatchesCompleted,
      pendingLabTests,
      shipmentsInProgress,
      farmsWithHighEudrRisk,
      farmsWithPendingEudrCheck,
      complianceAvg,
      lotsLast8Weeks,
      recentLots,
      recentBatches,
      recentLabTests,
      recentShipments,
    ] = await Promise.all([
      // 1. Total paddy procured this calendar year
      prisma.procurementLot.aggregate({
        where: {
          organizationId: orgId,
          dateReceived: { gte: startOfYear },
        },
        _sum: {
          weightKg: true,
        },
      }),

      // 2. Total batches completed
      prisma.millingBatch.count({
        where: {
          organizationId: orgId,
          status: "COMPLETED",
        },
      }),

      // 3. Pending lab tests
      prisma.labTest.count({
        where: {
          organizationId: orgId,
          overallResult: "PENDING",
        },
      }),

      // 4. Shipments in progress (not DELIVERED)
      prisma.shipment.count({
        where: {
          organizationId: orgId,
          status: { not: "DELIVERED" },
        },
      }),

      // 5. Farms with HIGH EUDR risk
      prisma.farm.count({
        where: {
          farmer: { organizationId: orgId },
          eudrRiskLevel: "HIGH",
        },
      }),

      // 6. Farms with PENDING EUDR check
      prisma.farm.count({
        where: {
          farmer: { organizationId: orgId },
          eudrRiskLevel: "PENDING",
        },
      }),

      // 7. Average compliance score
      prisma.shipment.aggregate({
        where: {
          organizationId: orgId,
          complianceScore: { not: null },
        },
        _avg: {
          complianceScore: true,
        },
      }),

      // 8. Lots received during last 8 weeks for trend chart
      prisma.procurementLot.findMany({
        where: {
          organizationId: orgId,
          dateReceived: { gte: earliestWeekStart },
        },
        select: {
          weightKg: true,
          dateReceived: true,
        },
      }),

      // 9. Recent lots created
      prisma.procurementLot.findMany({
        where: { organizationId: orgId },
        select: {
          lotNumber: true,
          createdAt: true,
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // 10. Recent completed batches
      prisma.millingBatch.findMany({
        where: { organizationId: orgId, status: "COMPLETED" },
        select: {
          batchNumber: true,
          updatedAt: true,
          createdBy: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),

      // 11. Recent lab tests
      prisma.labTest.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          reportNumber: true,
          createdAt: true,
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // 12. Recent shipments created
      prisma.shipment.findMany({
        where: { organizationId: orgId },
        select: {
          shipmentNumber: true,
          createdAt: true,
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // Aggregate procurement by district (Top 5)
    let procurementByDistrict: { district: string; totalKg: number }[] = [];
    try {
      const districtRows = await prisma.$queryRaw<DistrictRow[]>`
        SELECT f.district, CAST(COALESCE(SUM(l."weightKg"), 0) AS DOUBLE PRECISION) as "totalKg"
        FROM "ProcurementLot" l
        JOIN "Farm" f ON l."farmId" = f.id
        WHERE l."organizationId" = ${orgId}
        GROUP BY f.district
        ORDER BY "totalKg" DESC
        LIMIT 5
      `;
      procurementByDistrict = districtRows.map((r) => ({
        district: r.district,
        totalKg: Math.round(Number(r.totalKg) * 100) / 100,
      }));
    } catch {
      const lotsWithDistrict = await prisma.procurementLot.findMany({
        where: { organizationId: orgId },
        select: {
          weightKg: true,
          farm: { select: { district: true } },
        },
      });
      const districtMap = new Map<string, number>();
      for (const lot of lotsWithDistrict) {
        const districtName = lot.farm?.district ?? "Unknown";
        districtMap.set(districtName, (districtMap.get(districtName) ?? 0) + lot.weightKg);
      }
      procurementByDistrict = Array.from(districtMap.entries())
        .map(([district, totalKg]) => ({ district, totalKg: Math.round(totalKg * 100) / 100 }))
        .sort((a, b) => b.totalKg - a.totalKg)
        .slice(0, 5);
    }

    // Populate weekly buckets
    for (const lot of lotsLast8Weeks) {
      const lotTime = new Date(lot.dateReceived).getTime();
      for (const bucket of weekBuckets) {
        if (lotTime >= bucket.start.getTime() && lotTime < bucket.end.getTime()) {
          bucket.totalKg += lot.weightKg;
          break;
        }
      }
    }

    const weeklyProcurement = weekBuckets.map((b) => ({
      weekStart: b.weekStart,
      totalKg: Math.round(b.totalKg * 100) / 100,
    }));

    // Merge and sort recent activities across all 4 streams
    const recentActivity: ActivityItem[] = [
      ...recentLots.map((l) => ({
        type: "LOT_CREATED" as const,
        referenceNumber: l.lotNumber,
        createdBy: l.createdBy.name,
        createdAt: l.createdAt,
      })),
      ...recentBatches.map((b) => ({
        type: "BATCH_COMPLETED" as const,
        referenceNumber: b.batchNumber,
        createdBy: b.createdBy.name,
        createdAt: b.updatedAt,
      })),
      ...recentLabTests.map((t) => ({
        type: "LAB_TEST_ADDED" as const,
        referenceNumber: t.reportNumber ?? t.id,
        createdBy: t.createdBy.name,
        createdAt: t.createdAt,
      })),
      ...recentShipments.map((s) => ({
        type: "SHIPMENT_CREATED" as const,
        referenceNumber: s.shipmentNumber,
        createdBy: s.createdBy.name,
        createdAt: s.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    const avgScore = complianceAvg._avg.complianceScore;
    const averageComplianceScore = avgScore !== null && avgScore !== undefined ? Number(avgScore.toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalPaddyKgThisYear: totalPaddyAgg._sum.weightKg ?? 0,
        totalBatchesCompleted,
        pendingLabTests,
        shipmentsInProgress,
        farmsWithHighEudrRisk,
        farmsWithPendingEudrCheck,
        averageComplianceScore,
        procurementByDistrict,
        weeklyProcurement,
        recentActivity,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Record not found" },
        });
      }
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          error: { code: "DUPLICATE", message: "A record with this value already exists" },
        });
      }
    }
    if (error instanceof Prisma.PrismaClientValidationError) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid data provided" },
      });
    }
    console.error("[DashboardController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}
