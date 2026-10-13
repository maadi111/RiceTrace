/**
 * @file apps/api/src/controllers/batch.controller.ts
 * @description Controller for Milling Batch operations in RiceTrace.
 * Handles listing, creating, fetching by ID, linking lots, and updating batches.
 * All operations are scoped to req.user.organizationId.
 */

import type { Request, Response } from "express";
import { prisma, Prisma, BatchStatus, RiceVariety, LotStatus } from "@ricetrace/db";

/**
 * GET /batches
 * List milling batches with filters, pagination, mill name,
 * count of linked lots, and lab test results summary.
 */
export async function listBatches(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 20);

    const { millId, status, variety, startDate, endDate } = req.query;

    const where: Prisma.MillingBatchWhereInput = {
      organizationId: orgId,
      ...(millId && typeof millId === "string" ? { millId } : {}),
      ...(status && typeof status === "string" && Object.values(BatchStatus).includes(status as BatchStatus)
        ? { status: status as BatchStatus }
        : {}),
      ...(variety && typeof variety === "string" && Object.values(RiceVariety).includes(variety as RiceVariety)
        ? { variety: variety as RiceVariety }
        : {}),
      ...(startDate || endDate
        ? {
            startDate: {
              ...(startDate ? { gte: new Date(String(startDate)) } : {}),
              ...(endDate ? { lte: new Date(String(endDate)) } : {}),
            },
          }
        : {}),
    };

    const [batches, total] = await Promise.all([
      prisma.millingBatch.findMany({
        where,
        include: {
          mill: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              lotLinks: true,
            },
          },
          labTests: {
            select: {
              id: true,
              testType: true,
              overallResult: true,
              testDate: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: "desc" },
      }),
      prisma.millingBatch.count({ where }),
    ]);

    const formattedBatches = batches.map((batch) => {
      const tests = batch.labTests;
      const passCount = tests.filter((t) => t.overallResult === "PASS").length;
      const failCount = tests.filter((t) => t.overallResult === "FAIL").length;
      const pendingCount = tests.filter((t) => t.overallResult === "PENDING").length;

      return {
        ...batch,
        linkedLotsCount: batch._count.lotLinks,
        labTestResultsSummary: {
          total: tests.length,
          passed: passCount,
          failed: failCount,
          pending: pendingCount,
          conditional: tests.filter((t) => t.overallResult === "CONDITIONAL").length,
        },
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedBatches,
      meta: { page, limit, total },
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
    console.error("[BatchController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * POST /batches
 * Create a new milling batch.
 * Auto-generates batchNumber (BATCH-YYYY-XXXXX) based on count of batches this year + 1.
 */
export async function createBatch(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const { millId, variety, startDate, paddyInputKg, notes } = req.body;

    if (!millId || typeof millId !== "string") {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "millId is required", field: "millId" },
      });
    }

    if (!variety || typeof variety !== "string" || !Object.values(RiceVariety).includes(variety as RiceVariety)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Valid rice variety is required", field: "variety" },
      });
    }

    if (!startDate) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "startDate is required", field: "startDate" },
      });
    }

    if (typeof paddyInputKg !== "number" || paddyInputKg <= 0 || isNaN(paddyInputKg)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "paddyInputKg must be greater than 0", field: "paddyInputKg" },
      });
    }

    // Auto-generate batchNumber: "BATCH-" + YYYY + "-" + zero-padded 5-digit sequential number
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);

    const countThisYear = await prisma.millingBatch.count({
      where: {
        organizationId: orgId,
        createdAt: {
          gte: startOfYear,
          lt: endOfYear,
        },
      },
    });

    const nextSeq = countThisYear + 1;
    let batchNumber = `BATCH-${currentYear}-${String(nextSeq).padStart(5, "0")}`;

    const existingBatch = await prisma.millingBatch.findUnique({ where: { batchNumber } });
    if (existingBatch) {
      const allMatching = await prisma.millingBatch.findMany({
        where: {
          organizationId: orgId,
          batchNumber: { startsWith: `BATCH-${currentYear}-` },
        },
        select: { batchNumber: true },
      });
      const maxSeq = allMatching.reduce((max, b) => {
        const parts = b.batchNumber.split("-");
        const val = parseInt(parts[2] ?? "0", 10);
        return isNaN(val) ? max : Math.max(max, val);
      }, nextSeq);
      batchNumber = `BATCH-${currentYear}-${String(maxSeq + 1).padStart(5, "0")}`;
    }

    const batch = await prisma.millingBatch.create({
      data: {
        batchNumber,
        organizationId: orgId,
        millId,
        createdById: req.user.id,
        variety: variety as RiceVariety,
        startDate: new Date(startDate),
        paddyInputKg,
        notes: notes ? String(notes) : null,
      },
      include: {
        mill: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: batch,
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
    console.error("[BatchController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * GET /batches/:id
 * Fetch batch by ID scoped to organization.
 * Includes mill, linked lots (with farmer and farm data), and all lab tests.
 * Computes and returns millingYield if outputWhiteKg and paddyInputKg are present.
 */
export async function getBatchById(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const { id } = req.params;

    const batch = await prisma.millingBatch.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
      include: {
        mill: true,
        lotLinks: {
          include: {
            procurementLot: {
              include: {
                farmer: true,
                farm: true,
              },
            },
          },
        },
        labTests: true,
      },
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Milling batch not found" },
      });
    }

    let millingYield = batch.millingYield;
    if (batch.outputWhiteKg !== null && batch.outputWhiteKg !== undefined && batch.paddyInputKg > 0) {
      millingYield = Number(((batch.outputWhiteKg / batch.paddyInputKg) * 100).toFixed(2));
    }

    return res.status(200).json({
      success: true,
      data: {
        ...batch,
        millingYield,
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
    console.error("[BatchController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * POST /batches/:id/lots
 * Link a procurement lot to a batch with a specified weightUsedKg.
 * Validates weightUsedKg > 0, verifies lot belongs to org,
 * ensures lot's cumulative weightUsedKg does not exceed lot's weightKg,
 * creates junction record, and updates lot status.
 */
export async function linkLotToBatch(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const { id } = req.params;
    const { lotId, weightUsedKg } = req.body;

    if (!lotId || typeof lotId !== "string") {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "lotId is required", field: "lotId" },
      });
    }

    if (typeof weightUsedKg !== "number" || weightUsedKg <= 0 || isNaN(weightUsedKg)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "weightUsedKg must be greater than 0", field: "weightUsedKg" },
      });
    }

    // Verify batch exists and belongs to org
    const batch = await prisma.millingBatch.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Milling batch not found" },
      });
    }

    // Verify lot exists and belongs to org
    const lot = await prisma.procurementLot.findFirst({
      where: { id: lotId, organizationId: orgId },
    });

    if (!lot) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Procurement lot not found in this organization" },
      });
    }

    // 1. Query sum of all existing BatchLotLink.weightUsedKg for this lotId
    const aggregateResult = await prisma.batchLotLink.aggregate({
      where: { procurementLotId: lotId },
      _sum: { weightUsedKg: true },
    });
    const alreadyUsed = aggregateResult._sum.weightUsedKg ?? 0;

    // 2. If alreadyUsed + newWeightUsedKg > lot.weightKg:
    if (alreadyUsed + weightUsedKg > lot.weightKg) {
      return res.status(400).json({
        code: "WEIGHT_EXCEEDED",
        message: `Only ${lot.weightKg - alreadyUsed}kg available from lot ${lot.lotNumber}`,
      });
    }

    // Determine updated lot status
    const newTotalUsed = alreadyUsed + weightUsedKg;
    const newLotStatus: LotStatus = newTotalUsed >= lot.weightKg ? "IN_MILLING" : "PARTIALLY_MILLED";

    const [junctionRecord, updatedLot] = await prisma.$transaction([
      prisma.batchLotLink.upsert({
        where: {
          millingBatchId_procurementLotId: {
            millingBatchId: id,
            procurementLotId: lotId,
          },
        },
        create: {
          millingBatchId: id,
          procurementLotId: lotId,
          weightUsedKg,
        },
        update: {
          weightUsedKg: { increment: weightUsedKg },
        },
      }),
      prisma.procurementLot.update({
        where: { id: lotId },
        data: { status: newLotStatus },
      }),
    ]);

    return res.status(201).json({
      success: true,
      data: {
        link: junctionRecord,
        lot: updatedLot,
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
    console.error("[BatchController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * PATCH /batches/:id
 * Partial update for a milling batch.
 * When status is set to COMPLETED, computes and saves millingYield.
 * Validates yield is between 50% and 75% — returns warning if outside range.
 */
export async function updateBatch(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const { id } = req.params;

    const existingBatch = await prisma.millingBatch.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existingBatch) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Milling batch not found" },
      });
    }

    const paddyInputKg =
      req.body.paddyInputKg !== undefined ? Number(req.body.paddyInputKg) : existingBatch.paddyInputKg;
    const outputWhiteKg =
      req.body.outputWhiteKg !== undefined
        ? Number(req.body.outputWhiteKg)
        : existingBatch.outputWhiteKg;

    let computedYield: number | undefined = undefined;
    let warning: string | undefined = undefined;

    const targetStatus = req.body.status ?? existingBatch.status;

    if (targetStatus === "COMPLETED" || req.body.status === "COMPLETED") {
      if (outputWhiteKg !== null && outputWhiteKg !== undefined && paddyInputKg > 0) {
        computedYield = Number(((outputWhiteKg / paddyInputKg) * 100).toFixed(2));
        if (computedYield < 50 || computedYield > 75) {
          warning = `Milling yield ${computedYield}% is outside expected range 50-75%`;
        }
      }
    }

    const updateData: Prisma.MillingBatchUpdateInput = {};
    if (req.body.endDate !== undefined) {
      updateData.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
    }
    if (req.body.outputWhiteKg !== undefined) {
      updateData.outputWhiteKg = Number(req.body.outputWhiteKg);
    }
    if (req.body.outputBrokenKg !== undefined) {
      updateData.outputBrokenKg = Number(req.body.outputBrokenKg);
    }
    if (req.body.outputBranKg !== undefined) {
      updateData.outputBranKg = Number(req.body.outputBranKg);
    }
    if (req.body.status !== undefined && Object.values(BatchStatus).includes(req.body.status as BatchStatus)) {
      updateData.status = req.body.status as BatchStatus;
    }
    if (req.body.notes !== undefined) {
      updateData.notes = req.body.notes ? String(req.body.notes) : null;
    }
    if (computedYield !== undefined) {
      updateData.millingYield = computedYield;
    }

    const updatedBatch = await prisma.millingBatch.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      data: updatedBatch,
      ...(warning ? { warning } : {}),
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
    console.error("[BatchController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}
