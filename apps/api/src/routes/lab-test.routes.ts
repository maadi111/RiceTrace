/**
 * @file apps/api/src/routes/lab-test.routes.ts
 * @description Lab Test API routes.
 * Implements all /lab-tests endpoints from the spec.
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { CreateLabTestSchema, UpdateLabTestSchema, LabTestQuerySchema } from "@ricetrace/validators";
import { prisma } from "@ricetrace/db";
import { saveFile } from "../services/storage.service.js";
import { Errors } from "../middleware/error.middleware.js";
import { uploadRateLimiter } from "../middleware/rate-limit.middleware.js";
import type { ApiSuccess } from "@ricetrace/types";

export const labTestRouter = Router();
labTestRouter.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB for PDFs

// GET /api/v1/lab-tests
labTestRouter.get(
  "/",
  validate(LabTestQuerySchema, "query"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;
      const { page, limit, batchId, result, testType } = req.query as Record<string, string | undefined>;

      const pageNum = Number(page ?? 1);
      const limitNum = Number(limit ?? 20);

      const where = {
        organizationId: orgId,
        ...(batchId ? { millingBatchId: batchId } : {}),
        ...(result ? { overallResult: result as "PASS" } : {}),
        ...(testType ? { testType: testType as "PESTICIDE_RESIDUE" } : {}),
      };

      const [tests, total] = await prisma.$transaction([
        prisma.labTest.findMany({
          where,
          include: {
            millingBatch: { select: { batchNumber: true, variety: true } },
          },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: { testDate: "desc" },
        }),
        prisma.labTest.count({ where }),
      ]);

      const body: ApiSuccess<typeof tests> = {
        success: true,
        data: tests,
        meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/lab-tests
labTestRouter.post(
  "/",
  authorize("MILL_ADMIN", "QUALITY_MANAGER"),
  validate(CreateLabTestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;
      const data = req.body as { millingBatchId: string; labName: string; [key: string]: unknown };

      const batch = await prisma.millingBatch.findFirst({
        where: { id: data.millingBatchId, organizationId: orgId },
      });
      if (!batch) return next(Errors.notFound("Milling batch"));

      const labTest = await prisma.labTest.create({
        data: {
          organizationId: orgId,
          createdById: req.user!.id,
          ...(data as any),
        },
      });

      const body: ApiSuccess<typeof labTest> = { success: true, data: labTest };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/lab-tests/:id
labTestRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const test = await prisma.labTest.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
        include: {
          millingBatch: { select: { batchNumber: true, variety: true, mill: { select: { name: true } } } },
          createdBy: { select: { name: true } },
        },
      });

      if (!test) return next(Errors.notFound("Lab test"));

      const body: ApiSuccess<typeof test> = { success: true, data: test };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/lab-tests/:id
labTestRouter.patch(
  "/:id",
  authorize("MILL_ADMIN", "QUALITY_MANAGER"),
  validate(UpdateLabTestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.labTest.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!existing) return next(Errors.notFound("Lab test"));

      const test = await prisma.labTest.update({
        where: { id: req.params["id"] },
        data: req.body as Record<string, unknown>,
      });

      const body: ApiSuccess<typeof test> = { success: true, data: test };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/lab-tests/:id/certificate
labTestRouter.post(
  "/:id/certificate",
  authorize("MILL_ADMIN", "QUALITY_MANAGER"),
  uploadRateLimiter,
  upload.single("certificate"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.labTest.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!existing) return next(Errors.notFound("Lab test"));

      const file = req.file;
      if (!file) return next(Errors.badRequest("No file uploaded", "certificate"));

      const uploaded = await saveFile({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        prefix: "lab-certs",
        orgId: req.user!.organizationId,
      });

      const test = await prisma.labTest.update({
        where: { id: req.params["id"] },
        data: { certificateUrl: uploaded.url },
      });

      const body: ApiSuccess<{ certificateUrl: string }> = {
        success: true,
        data: { certificateUrl: test.certificateUrl! },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/lab-tests/:id/certificate
labTestRouter.delete(
  "/:id/certificate",
  authorize("MILL_ADMIN", "QUALITY_MANAGER"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.labTest.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!existing) return next(Errors.notFound("Lab test"));

      await prisma.labTest.update({
        where: { id: req.params["id"] },
        data: { certificateUrl: null },
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
