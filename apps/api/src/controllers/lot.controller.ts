/**
 * @file apps/api/src/controllers/lot.controller.ts
 * @description Controller for Procurement Lot operations in RiceTrace.
 * Handles listing, creating (with nested pesticide/fertilizer records),
 * and fetching lots by ID.
 * All operations are scoped to req.user.organizationId.
 */

import type { Request, Response } from "express";
import { prisma, Prisma, LotStatus, RiceVariety } from "@ricetrace/db";

interface PesticideRecordInput {
  name: string;
  activeIngredient?: string | null;
  applicationDate?: string | Date | null;
  daysBeforeHarvest?: number | null;
  doseLitersPerAcre?: number | null;
}

interface FertilizerRecordInput {
  name: string;
  npkRatio?: string | null;
  applicationDate?: string | Date | null;
}

/**
 * GET /lots
 * List procurement lots with filters, pagination, and linked farmer/farm/mill info.
 */
export async function listLots(req: Request, res: Response): Promise<Response> {
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

    const { millId, farmerId, status, variety, startDate, endDate } = req.query;

    const where: Prisma.ProcurementLotWhereInput = {
      organizationId: orgId,
      ...(millId && typeof millId === "string" ? { millId } : {}),
      ...(farmerId && typeof farmerId === "string" ? { farmerId } : {}),
      ...(status && typeof status === "string" && Object.values(LotStatus).includes(status as LotStatus)
        ? { status: status as LotStatus }
        : {}),
      ...(variety && typeof variety === "string" && Object.values(RiceVariety).includes(variety as RiceVariety)
        ? { variety: variety as RiceVariety }
        : {}),
      ...(startDate || endDate
        ? {
          dateReceived: {
            ...(startDate ? { gte: new Date(String(startDate)) } : {}),
            ...(endDate ? { lte: new Date(String(endDate)) } : {}),
          },
        }
        : {}),
    };

    const [lots, total] = await Promise.all([
      prisma.procurementLot.findMany({
        where,
        include: {
          farmer: {
            select: {
              id: true,
              name: true,
              cnic: true,
            },
          },
          farm: {
            select: {
              id: true,
              district: true,
            },
          },
          mill: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dateReceived: "desc" },
      }),
      prisma.procurementLot.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: lots,
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
    console.error("[LotController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * POST /lots
 * Create a new procurement lot.
 * Auto-generates lotNumber (LOT-YYYY-XXXXX) based on count of lots this year + 1.
 * Validates weightKg > 0 and moisturePercent 0-30.
 * Creates nested pesticideRecords and fertilizerRecords.
 */
export async function createLot(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const {
      millId,
      farmerId,
      farmId,
      variety,
      weightKg,
      moisturePercent,
      dateReceived,
      vehicleNumber,
      noPesticidesFlag,
      pesticideRecords,
      pesticidesUsed,
      fertilizerRecords,
      fertilizersUsed,
      gpsLat,
      gpsLng,
      photoUrls,
      notes,
    } = req.body;

    if (!millId || typeof millId !== "string") {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "millId is required", field: "millId" },
      });
    }

    if (!farmerId || typeof farmerId !== "string") {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "farmerId is required", field: "farmerId" },
      });
    }

    if (!farmId || typeof farmId !== "string") {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "farmId is required", field: "farmId" },
      });
    }

    if (!variety || typeof variety !== "string" || !Object.values(RiceVariety).includes(variety as RiceVariety)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Valid rice variety is required", field: "variety" },
      });
    }

    if (typeof weightKg !== "number" || weightKg <= 0 || isNaN(weightKg)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "weightKg must be a positive number greater than 0",
          field: "weightKg",
        },
      });
    }

    if (moisturePercent !== undefined && moisturePercent !== null) {
      if (typeof moisturePercent !== "number" || moisturePercent < 0 || moisturePercent > 30 || isNaN(moisturePercent)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "moisturePercent must be between 0 and 30",
            field: "moisturePercent",
          },
        });
      }
    }

    // Auto-generate lotNumber: "LOT-" + YYYY + "-" + zero-padded 5-digit sequential number
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);

    const countThisYear = await prisma.procurementLot.count({
      where: {
        organizationId: orgId,
        createdAt: {
          gte: startOfYear,
          lt: endOfYear,
        },
      },
    });

    const nextSeq = countThisYear + 1;
    let lotNumber = `LOT-${currentYear}-${String(nextSeq).padStart(5, "0")}`;

    // Ensure uniqueness within the database
    const existingLot = await prisma.procurementLot.findUnique({ where: { lotNumber } });
    if (existingLot) {
      const allMatching = await prisma.procurementLot.findMany({
        where: {
          organizationId: orgId,
          lotNumber: { startsWith: `LOT-${currentYear}-` },
        },
        select: { lotNumber: true },
      });
      const maxSeq = allMatching.reduce((max, l) => {
        const parts = l.lotNumber.split("-");
        const val = parseInt(parts[2] ?? "0", 10);
        return isNaN(val) ? max : Math.max(max, val);
      }, nextSeq);
      lotNumber = `LOT-${currentYear}-${String(maxSeq + 1).padStart(5, "0")}`;
    }

    const pesticides: PesticideRecordInput[] = (pesticideRecords ?? pesticidesUsed ?? []) as PesticideRecordInput[];
    const fertilizers: FertilizerRecordInput[] = (fertilizerRecords ?? fertilizersUsed ?? []) as FertilizerRecordInput[];

    const createdLot = await prisma.procurementLot.create({
      data: {
        lotNumber,
        organizationId: orgId,
        millId,
        farmerId,
        farmId,
        createdById: req.user.id,
        variety: variety as RiceVariety,
        weightKg,
        moisturePercent: moisturePercent !== undefined && moisturePercent !== null ? Number(moisturePercent) : null,
        dateReceived: dateReceived ? new Date(dateReceived) : new Date(),
        vehicleNumber: vehicleNumber ? String(vehicleNumber).trim() : null,
        noPesticidesFlag: Boolean(noPesticidesFlag),
        gpsLat: gpsLat !== undefined && gpsLat !== null ? Number(gpsLat) : null,
        gpsLng: gpsLng !== undefined && gpsLng !== null ? Number(gpsLng) : null,
        photoUrls: Array.isArray(photoUrls) ? photoUrls.map(String) : [],
        notes: notes ? String(notes) : null,
        pesticidesUsed: pesticides.length > 0
          ? {
            create: pesticides.map((p) => ({
              name: String(p.name).trim(),
              activeIngredient: p.activeIngredient ? String(p.activeIngredient).trim() : null,
              applicationDate: p.applicationDate ? new Date(p.applicationDate) : null,
              daysBeforeHarvest:
                p.daysBeforeHarvest !== undefined && p.daysBeforeHarvest !== null
                  ? Number(p.daysBeforeHarvest)
                  : null,
              doseLitersPerAcre:
                p.doseLitersPerAcre !== undefined && p.doseLitersPerAcre !== null
                  ? Number(p.doseLitersPerAcre)
                  : null,
            })),
          }
          : undefined,
        fertilizersUsed: fertilizers.length > 0
          ? {
            create: fertilizers.map((f) => ({
              name: String(f.name).trim(),
              npkRatio: f.npkRatio ? String(f.npkRatio).trim() : null,
              applicationDate: f.applicationDate ? new Date(f.applicationDate) : null,
            })),
          }
          : undefined,
      },
      include: {
        farmer: true,
        farm: true,
        mill: true,
        pesticidesUsed: true,
        fertilizersUsed: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: createdLot,
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
    console.error("[LotController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * GET /lots/:id
 * Fetch lot by ID scoped to organization.
 * Includes farmer, farm (with GPS and eudrRiskLevel), pesticideRecords,
 * fertilizerRecords, and batchLinks (with millingBatch info).
 */
export async function getLotById(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const { id } = req.params;

    const lot = await prisma.procurementLot.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
      include: {
        farmer: true,
        farm: {
          select: {
            id: true,
            farmerId: true,
            name: true,
            areaAcres: true,
            geoLat: true,
            geoLng: true,
            district: true,
            tehsil: true,
            eudrRiskLevel: true,
            eudrCheckedAt: true,
          },
        },
        mill: {
          select: {
            id: true,
            name: true,
            district: true,
          },
        },
        pesticidesUsed: true,
        fertilizersUsed: true,
        batchLinks: {
          include: {
            millingBatch: {
              select: {
                id: true,
                batchNumber: true,
                status: true,
                variety: true,
                startDate: true,
                endDate: true,
                millingYield: true,
              },
            },
          },
        },
      },
    });

    if (!lot) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Procurement lot not found" },
      });
    }

    return res.status(200).json({
      success: true,
      data: lot,
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
    console.error("[LotController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}
