/**
 * @file apps/api/src/routes/farmer.routes.ts
 * @description Farmer and Farm CRUD API routes.
 * Implements all /farmers and /farmers/:id/farms endpoints from the spec.
 * Scope: all operations are org-scoped via req.user.organizationId.
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  CreateFarmerSchema,
  UpdateFarmerSchema,
  FarmerQuerySchema,
  CreateFarmSchema,
  UpdateFarmSchema,
} from "@ricetrace/validators";
import { prisma } from "@ricetrace/db";
import { saveFile } from "../services/storage.service.js";
import { runEudrCheckForFarm } from "../services/eudr.service.js";
import { Errors } from "../middleware/error.middleware.js";
import { uploadRateLimiter } from "../middleware/rate-limit.middleware.js";
import type { ApiSuccess } from "@ricetrace/types";

export const farmerRouter = Router();

// All farmer routes require authentication
farmerRouter.use(authenticate);

// Multer: in-memory storage for file uploads (validated before writing to disk/S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

// ─── FARMER CRUD ─────────────────────────────────────────────────────────────

// GET /api/v1/farmers
farmerRouter.get(
  "/",
  validate(FarmerQuerySchema, "query"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;
      const { page, limit, search, district, eudrRisk, isVerified } =
        req.query as Record<string, string>;

      const pageNum = Number(page ?? 1);
      const limitNum = Number(limit ?? 20);

      const where = {
        organizationId: orgId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { cnic: { contains: search } },
              ],
            }
          : {}),
        ...(district ? { district: { equals: district, mode: "insensitive" as const } } : {}),
        ...(isVerified !== undefined ? { isVerified: isVerified === "true" } : {}),
      };

      // Filter by EUDR risk requires joining through farms
      const farmsEudrFilter =
        eudrRisk
          ? { some: { eudrRiskLevel: eudrRisk as "PENDING" | "LOW" | "MEDIUM" | "HIGH" } }
          : undefined;

      const [farmers, total] = await prisma.$transaction([
        prisma.farmer.findMany({
          where: {
            ...where,
            ...(farmsEudrFilter ? { farms: farmsEudrFilter } : {}),
          },
          include: {
            _count: { select: { farms: true, procurementLots: true } },
            farms: { select: { eudrRiskLevel: true } },
          },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: { createdAt: "desc" },
        }),
        prisma.farmer.count({
          where: {
            ...where,
            ...(farmsEudrFilter ? { farms: farmsEudrFilter } : {}),
          },
        }),
      ]);

      const body: ApiSuccess<typeof farmers> = {
        success: true,
        data: farmers,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/farmers
farmerRouter.post(
  "/",
  authorize("MILL_ADMIN", "PROCUREMENT_OFFICER"),
  validate(CreateFarmerSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;
      const data = req.body as {
        cnic: string;
        name: string;
        fatherName?: string;
        phone?: string;
        village?: string;
        union?: string;
        tehsil?: string;
        district: string;
      };

      const farmer = await prisma.farmer.create({
        data: {
          organizationId: orgId,
          ...data,
        },
      });

      const body: ApiSuccess<typeof farmer> = { success: true, data: farmer };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/farmers/:id
farmerRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmer = await prisma.farmer.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
        include: {
          farms: {
            include: { _count: { select: { procurementLots: true } } },
            orderBy: { createdAt: "desc" },
          },
          procurementLots: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: { mill: { select: { name: true } } },
          },
          _count: { select: { farms: true, procurementLots: true } },
        },
      });

      if (!farmer) return next(Errors.notFound("Farmer"));

      const body: ApiSuccess<typeof farmer> = { success: true, data: farmer };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/farmers/:id
farmerRouter.patch(
  "/:id",
  authorize("MILL_ADMIN", "PROCUREMENT_OFFICER"),
  validate(UpdateFarmerSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.farmer.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!existing) return next(Errors.notFound("Farmer"));

      const farmer = await prisma.farmer.update({
        where: { id: req.params["id"] },
        data: req.body as Record<string, unknown>,
      });

      const body: ApiSuccess<typeof farmer> = { success: true, data: farmer };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/farmers/:id/cnic-photo
farmerRouter.post(
  "/:id/cnic-photo",
  authorize("MILL_ADMIN", "PROCUREMENT_OFFICER"),
  uploadRateLimiter,
  upload.fields([
    { name: "front", maxCount: 1 },
    { name: "back", maxCount: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.farmer.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!existing) return next(Errors.notFound("Farmer"));

      const files = req.files as
        | Record<string, Express.Multer.File[]>
        | undefined;
      const frontFile = files?.["front"]?.[0];
      const backFile = files?.["back"]?.[0];

      let cnicPhotoUrl = existing.cnicPhotoUrl;

      if (frontFile) {
        const uploaded = await saveFile({
          buffer: frontFile.buffer,
          originalName: frontFile.originalname,
          mimeType: frontFile.mimetype,
          prefix: "cnic-photos",
          orgId: req.user!.organizationId,
        });
        cnicPhotoUrl = uploaded.url;
      }

      const farmer = await prisma.farmer.update({
        where: { id: req.params["id"] },
        data: { cnicPhotoUrl },
      });

      const body: ApiSuccess<{ cnicPhotoUrl: string | null }> = {
        success: true,
        data: { cnicPhotoUrl: farmer.cnicPhotoUrl },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// ─── FARM ROUTES ─────────────────────────────────────────────────────────────

// GET /api/v1/farmers/:id/farms
farmerRouter.get(
  "/:id/farms",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmer = await prisma.farmer.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!farmer) return next(Errors.notFound("Farmer"));

      const farms = await prisma.farm.findMany({
        where: { farmerId: req.params["id"] },
        include: { _count: { select: { procurementLots: true } } },
        orderBy: { createdAt: "desc" },
      });

      const body: ApiSuccess<typeof farms> = { success: true, data: farms };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/farmers/:id/farms
farmerRouter.post(
  "/:id/farms",
  authorize("MILL_ADMIN", "PROCUREMENT_OFFICER"),
  validate(CreateFarmSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmer = await prisma.farmer.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!farmer) return next(Errors.notFound("Farmer"));

      const farm = await prisma.farm.create({
        data: {
          farmerId: req.params["id"] as string,
          ...(req.body as any),
        },
      });

      // Trigger EUDR check asynchronously (don't block the response)
      runEudrCheckForFarm(farm.id).catch((err) =>
        console.error(`EUDR check failed for farm ${farm.id}:`, err)
      );

      const body: ApiSuccess<typeof farm> = { success: true, data: farm };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/farmers/:farmerId/farms/:id
farmerRouter.get(
  "/:farmerId/farms/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farm = await prisma.farm.findFirst({
        where: {
          id: req.params["id"],
          farmerId: req.params["farmerId"],
          farmer: { organizationId: req.user!.organizationId },
        },
        include: {
          farmer: { select: { id: true, name: true, cnic: true } },
          procurementLots: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              lotNumber: true,
              variety: true,
              weightKg: true,
              dateReceived: true,
              status: true,
            },
          },
        },
      });

      if (!farm) return next(Errors.notFound("Farm"));

      const body: ApiSuccess<typeof farm> = { success: true, data: farm };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/farmers/:farmerId/farms/:id
farmerRouter.patch(
  "/:farmerId/farms/:id",
  authorize("MILL_ADMIN", "PROCUREMENT_OFFICER"),
  validate(UpdateFarmSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.farm.findFirst({
        where: {
          id: req.params["id"],
          farmerId: req.params["farmerId"],
          farmer: { organizationId: req.user!.organizationId },
        },
      });
      if (!existing) return next(Errors.notFound("Farm"));

      const farm = await prisma.farm.update({
        where: { id: req.params["id"] },
        data: req.body as Record<string, unknown>,
      });

      // Re-trigger EUDR check if GPS changed
      const body_req = req.body as { geoLat?: number; geoLng?: number };
      if (body_req.geoLat !== undefined || body_req.geoLng !== undefined) {
        runEudrCheckForFarm(farm.id).catch((err) =>
          console.error(`EUDR re-check failed for farm ${farm.id}:`, err)
        );
      }

      const body: ApiSuccess<typeof farm> = { success: true, data: farm };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/farmers/:farmerId/farms/:id/eudr-check
farmerRouter.post(
  "/:farmerId/farms/:id/eudr-check",
  authorize("MILL_ADMIN", "QUALITY_MANAGER"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farm = await prisma.farm.findFirst({
        where: {
          id: req.params["id"],
          farmerId: req.params["farmerId"],
          farmer: { organizationId: req.user!.organizationId },
        },
      });
      if (!farm) return next(Errors.notFound("Farm"));

      const riskLevel = await runEudrCheckForFarm(farm.id);

      const body: ApiSuccess<{ riskLevel: string }> = {
        success: true,
        data: { riskLevel },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/farmers/:farmerId/farms/:id/photos
farmerRouter.post(
  "/:farmerId/farms/:id/photos",
  authorize("MILL_ADMIN", "PROCUREMENT_OFFICER"),
  uploadRateLimiter,
  upload.array("photos", 10),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farm = await prisma.farm.findFirst({
        where: {
          id: req.params["id"],
          farmerId: req.params["farmerId"],
          farmer: { organizationId: req.user!.organizationId },
        },
      });
      if (!farm) return next(Errors.notFound("Farm"));

      const uploadedFiles = req.files as Express.Multer.File[];
      const urls: string[] = [];

      for (const file of uploadedFiles) {
        const uploaded = await saveFile({
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          prefix: "farm-photos",
          orgId: req.user!.organizationId,
        });
        urls.push(uploaded.url);
      }

      const updated = await prisma.farm.update({
        where: { id: farm.id },
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
