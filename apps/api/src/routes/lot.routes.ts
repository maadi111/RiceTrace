/**
 * @file apps/api/src/routes/lot.routes.ts
 * @description Procurement Lot API routes.
 * Implements all /lots endpoints from the spec.
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  CreateProcurementLotSchema,
  UpdateProcurementLotSchema,
  LotQuerySchema,
  PesticideRecordSchema,
} from "@ricetrace/validators";
import { prisma } from "@ricetrace/db";
import { saveFile } from "../services/storage.service.js";
import { nextSequenceNumber } from "../services/sequence.service.js";
import { Errors } from "../middleware/error.middleware.js";
import { uploadRateLimiter } from "../middleware/rate-limit.middleware.js";
import type { ApiSuccess } from "@ricetrace/types";

export const lotRouter = Router();
lotRouter.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// GET /api/v1/lots
lotRouter.get(
  "/",
  validate(LotQuerySchema, "query"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;
      const { page, limit, millId, farmerId, variety, status, district, dateFrom, dateTo } =
        req.query as Record<string, string | undefined>;

      const pageNum = Number(page ?? 1);
      const limitNum = Number(limit ?? 20);

      const where = {
        organizationId: orgId,
        ...(millId ? { millId } : {}),
        ...(farmerId ? { farmerId } : {}),
        ...(variety ? { variety: variety as "BASMATI_1121" } : {}),
        ...(status ? { status: status as "RECEIVED" } : {}),
        ...(district
          ? { farm: { district: { contains: district, mode: "insensitive" as const } } }
          : {}),
        ...(dateFrom || dateTo
          ? {
              dateReceived: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
      };

      const [lots, total] = await prisma.$transaction([
        prisma.procurementLot.findMany({
          where,
          include: {
            farmer: { select: { id: true, name: true, cnic: true } },
            farm: { select: { id: true, district: true, eudrRiskLevel: true } },
            mill: { select: { id: true, name: true } },
            _count: { select: { batchLinks: true } },
          },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: { createdAt: "desc" },
        }),
        prisma.procurementLot.count({ where }),
      ]);

      const body: ApiSuccess<typeof lots> = {
        success: true,
        data: lots,
        meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/lots
lotRouter.post(
  "/",
  authorize("MILL_ADMIN", "PROCUREMENT_OFFICER"),
  validate(CreateProcurementLotSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;
      const data = req.body as {
        millId: string;
        farmerId: string;
        farmId: string;
        variety: string;
        weightKg: number;
        moisturePercent?: number;
        dateReceived: Date;
        vehicleNumber?: string;
        noPesticidesFlag: boolean;
        pesticidesUsed: Array<{ name: string; [key: string]: unknown }>;
        fertilizersUsed: Array<{ name: string; [key: string]: unknown }>;
        gpsLat?: number;
        gpsLng?: number;
        notes?: string;
      };

      // Validate mill belongs to org
      const mill = await prisma.mill.findFirst({
        where: { id: data.millId, organizationId: orgId },
      });
      if (!mill) return next(Errors.notFound("Mill"));

      // Validate farmer belongs to org
      const farmer = await prisma.farmer.findFirst({
        where: { id: data.farmerId, organizationId: orgId },
      });
      if (!farmer) return next(Errors.notFound("Farmer"));

      // Validate farm belongs to farmer
      const farm = await prisma.farm.findFirst({
        where: { id: data.farmId, farmerId: data.farmerId },
      });
      if (!farm) return next(Errors.notFound("Farm"));

      const lotNumber = await nextSequenceNumber(orgId, "LOT");

      const lot = await prisma.procurementLot.create({
        data: {
          lotNumber,
          organizationId: orgId,
          millId: data.millId,
          farmerId: data.farmerId,
          farmId: data.farmId,
          createdById: req.user!.id,
          variety: data.variety as "BASMATI_1121",
          weightKg: data.weightKg,
          moisturePercent: data.moisturePercent,
          dateReceived: data.dateReceived,
          vehicleNumber: data.vehicleNumber,
          noPesticidesFlag: data.noPesticidesFlag,
          gpsLat: data.gpsLat,
          gpsLng: data.gpsLng,
          notes: data.notes,
          pesticidesUsed: { create: data.pesticidesUsed },
          fertilizersUsed: { create: data.fertilizersUsed },
        },
        include: {
          pesticidesUsed: true,
          fertilizersUsed: true,
          farmer: { select: { name: true } },
          farm: { select: { district: true, eudrRiskLevel: true } },
        },
      });

      const body: ApiSuccess<typeof lot> = { success: true, data: lot };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/lots/:id
lotRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lot = await prisma.procurementLot.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
        include: {
          farmer: true,
          farm: true,
          mill: true,
          createdBy: { select: { name: true, role: true } },
          pesticidesUsed: true,
          fertilizersUsed: true,
          batchLinks: {
            include: {
              millingBatch: {
                select: { id: true, batchNumber: true, status: true, variety: true },
              },
            },
          },
        },
      });

      if (!lot) return next(Errors.notFound("Procurement lot"));

      const body: ApiSuccess<typeof lot> = { success: true, data: lot };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/lots/:id
lotRouter.patch(
  "/:id",
  authorize("MILL_ADMIN", "PROCUREMENT_OFFICER"),
  validate(UpdateProcurementLotSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.procurementLot.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!existing) return next(Errors.notFound("Procurement lot"));

      if (existing.status !== "RECEIVED") {
        return next(
          Errors.badRequest("Lot cannot be edited after milling has begun", "status")
        );
      }

      const lot = await prisma.procurementLot.update({
        where: { id: req.params["id"] },
        data: req.body as Record<string, unknown>,
      });

      const body: ApiSuccess<typeof lot> = { success: true, data: lot };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/lots/:id/photos
lotRouter.post(
  "/:id/photos",
  authorize("MILL_ADMIN", "PROCUREMENT_OFFICER"),
  uploadRateLimiter,
  upload.array("photos", 10),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.procurementLot.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!existing) return next(Errors.notFound("Procurement lot"));

      const files = req.files as Express.Multer.File[];
      const urls: string[] = [];

      for (const file of files) {
        const uploaded = await saveFile({
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          prefix: "lot-photos",
          orgId: req.user!.organizationId,
        });
        urls.push(uploaded.url);
      }

      const updated = await prisma.procurementLot.update({
        where: { id: req.params["id"] },
        data: { photoUrls: { push: urls } },
      });

      const body: ApiSuccess<{ photoUrls: string[] }> = {
        success: true,
        data: { photoUrls: updated.photoUrls },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/lots/:id/traceability
lotRouter.get(
  "/:id/traceability",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lot = await prisma.procurementLot.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
        include: {
          farmer: { select: { id: true, name: true, cnic: true, district: true } },
          farm: true,
          mill: { select: { id: true, name: true, district: true } },
          pesticidesUsed: true,
          batchLinks: {
            include: {
              millingBatch: {
                include: {
                  shipmentItems: {
                    include: {
                      shipment: {
                        select: {
                          id: true,
                          shipmentNumber: true,
                          status: true,
                          complianceStatus: true,
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

      if (!lot) return next(Errors.notFound("Procurement lot"));

      const body: ApiSuccess<typeof lot> = { success: true, data: lot };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/lots/:id/pesticides
lotRouter.post(
  "/:id/pesticides",
  authorize("MILL_ADMIN", "PROCUREMENT_OFFICER"),
  validate(PesticideRecordSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.procurementLot.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!existing) return next(Errors.notFound("Procurement lot"));

      const record = await prisma.pesticideRecord.create({
        data: {
          procurementLotId: req.params["id"] as string,
          ...(req.body as any),
        },
      });

      const body: ApiSuccess<typeof record> = { success: true, data: record };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/lots/:id/pesticides/:pid
lotRouter.delete(
  "/:id/pesticides/:pid",
  authorize("MILL_ADMIN", "PROCUREMENT_OFFICER"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.procurementLot.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!existing) return next(Errors.notFound("Procurement lot"));

      await prisma.pesticideRecord.deleteMany({
        where: { id: req.params["pid"], procurementLotId: req.params["id"] },
      });

      const body: ApiSuccess<{ deleted: boolean }> = {
        success: true,
        data: { deleted: true },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);
