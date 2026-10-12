/**
 * @file apps/api/src/routes/batch.routes.ts
 * @description Milling Batch API routes.
 * Implements all /batches endpoints from the spec.
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  CreateMillingBatchSchema,
  UpdateMillingBatchSchema,
  LinkLotToBatchSchema,
  BatchQuerySchema,
} from "@ricetrace/validators";
import { prisma } from "@ricetrace/db";
import { nextSequenceNumber } from "../services/sequence.service.js";
import { Errors } from "../middleware/error.middleware.js";
import type { ApiSuccess } from "@ricetrace/types";

export const batchRouter = Router();
batchRouter.use(authenticate);

// GET /api/v1/batches
batchRouter.get(
  "/",
  validate(BatchQuerySchema, "query"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;
      const { page, limit, millId, status, variety, dateFrom, dateTo } =
        req.query as Record<string, string | undefined>;

      const pageNum = Number(page ?? 1);
      const limitNum = Number(limit ?? 20);

      const where = {
        organizationId: orgId,
        ...(millId ? { millId } : {}),
        ...(status ? { status: status as "IN_PROGRESS" } : {}),
        ...(variety ? { variety: variety as "BASMATI_1121" } : {}),
        ...(dateFrom || dateTo
          ? {
              startDate: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
      };

      const [batches, total] = await prisma.$transaction([
        prisma.millingBatch.findMany({
          where,
          include: {
            mill: { select: { name: true } },
            _count: { select: { lotLinks: true, labTests: true } },
          },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: { createdAt: "desc" },
        }),
        prisma.millingBatch.count({ where }),
      ]);

      const body: ApiSuccess<typeof batches> = {
        success: true,
        data: batches,
        meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/batches
batchRouter.post(
  "/",
  authorize("MILL_ADMIN", "MILL_MANAGER"),
  validate(CreateMillingBatchSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;
      const data = req.body as {
        millId: string;
        variety: string;
        startDate: Date;
        paddyInputKg: number;
        notes?: string;
      };

      const mill = await prisma.mill.findFirst({
        where: { id: data.millId, organizationId: orgId },
      });
      if (!mill) return next(Errors.notFound("Mill"));

      const batchNumber = await nextSequenceNumber(orgId, "BATCH");

      const batch = await prisma.millingBatch.create({
        data: {
          batchNumber,
          organizationId: orgId,
          millId: data.millId,
          createdById: req.user!.id,
          variety: data.variety as "BASMATI_1121",
          startDate: data.startDate,
          paddyInputKg: data.paddyInputKg,
          notes: data.notes,
        },
      });

      const body: ApiSuccess<typeof batch> = { success: true, data: batch };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/batches/:id
batchRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const batch = await prisma.millingBatch.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
        include: {
          mill: true,
          createdBy: { select: { name: true } },
          lotLinks: {
            include: {
              procurementLot: {
                include: {
                  farmer: { select: { id: true, name: true } },
                  farm: {
                    select: {
                      id: true,
                      district: true,
                      geoLat: true,
                      geoLng: true,
                      eudrRiskLevel: true,
                    },
                  },
                },
              },
            },
          },
          labTests: { orderBy: { testDate: "desc" } },
          _count: { select: { shipmentItems: true } },
        },
      });

      if (!batch) return next(Errors.notFound("Milling batch"));

      // Compute compliance indicator for the batch
      const allPassPesticide = batch.labTests.some(
        (t) =>
          t.testType === "PESTICIDE_RESIDUE" &&
          (t.overallResult === "PASS" || t.overallResult === "CONDITIONAL")
      );
      const anyFail = batch.labTests.some((t) => t.overallResult === "FAIL");

      let complianceIndicator: "GREEN" | "YELLOW" | "RED";
      if (anyFail) complianceIndicator = "RED";
      else if (allPassPesticide) complianceIndicator = "GREEN";
      else complianceIndicator = "YELLOW";

      const body: ApiSuccess<typeof batch & { complianceIndicator: string }> = {
        success: true,
        data: { ...batch, complianceIndicator },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/batches/:id
batchRouter.patch(
  "/:id",
  authorize("MILL_ADMIN", "MILL_MANAGER"),
  validate(UpdateMillingBatchSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.millingBatch.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
        include: { _count: { select: { lotLinks: true } } },
      });
      if (!existing) return next(Errors.notFound("Milling batch"));

      const updateData = req.body as {
        endDate?: Date;
        outputWhiteKg?: number;
        outputBrokenKg?: number;
        outputBranKg?: number;
        status?: string;
        notes?: string;
      };

      // Validate: batch cannot be completed without any linked lots
      if (updateData.status === "COMPLETED" && existing._count.lotLinks === 0) {
        return next(
          Errors.badRequest(
            "Cannot complete a batch with no linked procurement lots",
            "status"
          )
        );
      }

      // Auto-calculate milling yield if outputs are provided
      const outputWhiteKg =
        updateData.outputWhiteKg ?? existing.outputWhiteKg ?? null;
      const millingYield =
        outputWhiteKg !== null
          ? Math.round((outputWhiteKg / existing.paddyInputKg) * 100 * 100) / 100
          : existing.millingYield;

      // Warn (not block) if yield is outside 50–75%
      if (millingYield !== null && (millingYield < 50 || millingYield > 75)) {
        console.warn(
          `Batch ${existing.batchNumber} milling yield ${millingYield}% is outside normal range (50–75%)`
        );
      }

      const batch = await prisma.millingBatch.update({
        where: { id: req.params["id"] },
        data: {
          ...updateData,
          millingYield,
        } as any,
      });

      const body: ApiSuccess<typeof batch> = { success: true, data: batch };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/batches/:id/lots
batchRouter.post(
  "/:id/lots",
  authorize("MILL_ADMIN", "MILL_MANAGER"),
  validate(LinkLotToBatchSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;
      const { lotId, weightUsedKg } = req.body as { lotId: string; weightUsedKg: number };

      const batch = await prisma.millingBatch.findFirst({
        where: { id: req.params["id"], organizationId: orgId },
      });
      if (!batch) return next(Errors.notFound("Milling batch"));

      const lot = await prisma.procurementLot.findFirst({
        where: { id: lotId, organizationId: orgId },
      });
      if (!lot) return next(Errors.notFound("Procurement lot"));

      if (weightUsedKg > lot.weightKg) {
        return next(
          Errors.badRequest(
            `Weight used (${weightUsedKg} kg) cannot exceed lot weight (${lot.weightKg} kg)`,
            "weightUsedKg"
          )
        );
      }

      const link = await prisma.batchLotLink.create({
        data: {
          millingBatchId: req.params["id"] as string,
          procurementLotId: lotId,
          weightUsedKg,
        },
        include: { procurementLot: { select: { lotNumber: true } } },
      });

      // Update lot status
      await prisma.procurementLot.update({
        where: { id: lotId },
        data: { status: "IN_MILLING" },
      });

      const body: ApiSuccess<typeof link> = { success: true, data: link };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/batches/:id/lots/:lotId
batchRouter.delete(
  "/:id/lots/:lotId",
  authorize("MILL_ADMIN", "MILL_MANAGER"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;

      const batch = await prisma.millingBatch.findFirst({
        where: { id: req.params["id"], organizationId: orgId },
      });
      if (!batch) return next(Errors.notFound("Milling batch"));

      await prisma.batchLotLink.deleteMany({
        where: {
          millingBatchId: req.params["id"],
          procurementLotId: req.params["lotId"],
        },
      });

      // Revert lot status if no longer linked to any batch
      const remainingLinks = await prisma.batchLotLink.count({
        where: { procurementLotId: req.params["lotId"] },
      });

      if (remainingLinks === 0) {
        await prisma.procurementLot.updateMany({
          where: { id: req.params["lotId"], organizationId: orgId },
          data: { status: "RECEIVED" },
        });
      }

      const body: ApiSuccess<{ unlinked: boolean }> = {
        success: true,
        data: { unlinked: true },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/batches/:id/traceability
batchRouter.get(
  "/:id/traceability",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const batch = await prisma.millingBatch.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
        include: {
          mill: true,
          lotLinks: {
            include: {
              procurementLot: {
                include: {
                  farmer: true,
                  farm: true,
                  pesticidesUsed: true,
                  fertilizersUsed: true,
                },
              },
            },
          },
          labTests: true,
        },
      });

      if (!batch) return next(Errors.notFound("Milling batch"));

      const body: ApiSuccess<typeof batch> = { success: true, data: batch };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);
