/**
 * @file apps/api/src/routes/dashboard.routes.ts
 * @description Dashboard and analytics API routes.
 * Returns aggregated metrics for the Mill Admin and Export Manager dashboards.
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { prisma } from "@ricetrace/db";
import type { ApiSuccess } from "@ricetrace/types";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);
dashboardRouter.use(authorize("MILL_ADMIN", "EXPORT_MANAGER"));

// GET /api/v1/dashboard/summary
dashboardRouter.get(
  "/summary",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalPaddyThisMonth,
        activeBatches,
        pendingLabTests,
        shipmentsInProgress,
        highRiskFarms,
        complianceData,
      ] = await prisma.$transaction([
        // Total paddy procured this month
        prisma.procurementLot.aggregate({
          where: { organizationId: orgId, dateReceived: { gte: startOfMonth } },
          _sum: { weightKg: true },
        }),
        // Active milling batches
        prisma.millingBatch.count({
          where: { organizationId: orgId, status: "IN_PROGRESS" },
        }),
        // Pending lab tests
        prisma.labTest.count({
          where: { organizationId: orgId, overallResult: "PENDING" },
        }),
        // Shipments in progress
        prisma.shipment.count({
          where: {
            organizationId: orgId,
            status: { in: ["UNDER_REVIEW", "CERTIFICATE_ISSUED", "SHIPPED"] },
          },
        }),
        // High EUDR risk farms
        prisma.farm.count({
          where: {
            farmer: { organizationId: orgId },
            eudrRiskLevel: "HIGH",
          },
        }),
        // Average compliance score
        prisma.shipment.aggregate({
          where: {
            organizationId: orgId,
            complianceScore: { not: null },
          },
          _avg: { complianceScore: true },
          _count: { id: true },
        }),
      ]);

      const summary = {
        paddyProcuredThisMonthKg: totalPaddyThisMonth._sum.weightKg ?? 0,
        activeBatches,
        pendingLabTests,
        shipmentsInProgress,
        highRiskFarms,
        averageComplianceScore: Math.round(complianceData._avg.complianceScore ?? 0),
        totalShipments: complianceData._count.id,
      };

      const body: ApiSuccess<typeof summary> = { success: true, data: summary };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/dashboard/procurement-stats
dashboardRouter.get(
  "/procurement-stats",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;

      // Top 5 districts by paddy volume
      const byDistrict = await prisma.procurementLot.groupBy({
        by: ["farmId"],
        where: { organizationId: orgId },
        _sum: { weightKg: true },
        orderBy: { _sum: { weightKg: "desc" } },
        take: 20,
      });

      // Volume by variety
      const byVariety = await prisma.procurementLot.groupBy({
        by: ["variety"],
        where: { organizationId: orgId },
        _sum: { weightKg: true },
        _count: { id: true },
        orderBy: { _sum: { weightKg: "desc" } },
      });

      // Lots per procurement officer (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const byOfficer = await prisma.procurementLot.groupBy({
        by: ["createdById"],
        where: {
          organizationId: orgId,
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { id: true },
        _sum: { weightKg: true },
        orderBy: { _count: { id: "desc" } },
      });

      const body: ApiSuccess<{ byDistrict: typeof byDistrict; byVariety: typeof byVariety; byOfficer: typeof byOfficer }> = {
        success: true,
        data: { byDistrict, byVariety, byOfficer },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/dashboard/compliance-overview
dashboardRouter.get(
  "/compliance-overview",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;

      const [shipmentsByStatus, shipmentsByCompliance, failedLabTests] =
        await prisma.$transaction([
          prisma.shipment.groupBy({
            by: ["status"],
            where: { organizationId: orgId },
            _count: { id: true },
            orderBy: { status: "asc" },
          }),
          prisma.shipment.groupBy({
            by: ["complianceStatus"],
            where: { organizationId: orgId },
            _count: { id: true },
            orderBy: { complianceStatus: "asc" },
          }),
          prisma.labTest.count({
            where: { organizationId: orgId, overallResult: "FAIL" },
          }),
        ]);

      const body: ApiSuccess<{
        shipmentsByStatus: typeof shipmentsByStatus;
        shipmentsByCompliance: typeof shipmentsByCompliance;
        failedLabTests: number;
      }> = {
        success: true,
        data: { shipmentsByStatus, shipmentsByCompliance, failedLabTests },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/dashboard/eudr-risk-map
dashboardRouter.get(
  "/eudr-risk-map",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;

      // All farms with GPS coordinates for the organization
      const farms = await prisma.farm.findMany({
        where: {
          farmer: { organizationId: orgId },
        },
        select: {
          id: true,
          name: true,
          geoLat: true,
          geoLng: true,
          district: true,
          eudrRiskLevel: true,
          eudrCheckedAt: true,
          farmer: { select: { name: true } },
        },
      });

      const body: ApiSuccess<typeof farms> = { success: true, data: farms };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);
