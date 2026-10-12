/**
 * @file apps/api/src/routes/shipment.routes.ts
 * @description Shipment and compliance certificate API routes.
 * Implements all /shipments endpoints from the spec.
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  CreateShipmentSchema,
  UpdateShipmentSchema,
  AddShipmentItemSchema,
  ShipmentQuerySchema,
} from "@ricetrace/validators";
import { prisma } from "@ricetrace/db";
import { nextSequenceNumber } from "../services/sequence.service.js";
import { calculateComplianceScore } from "../services/compliance.service.js";
import { generateShipmentCertificate } from "../services/certificate.service.js";
import { Errors } from "../middleware/error.middleware.js";
import type { ApiSuccess } from "@ricetrace/types";
import { getShipmentById, confirmDueDiligence } from "../controllers/shipment.controller.js";

export const shipmentRouter = Router();
shipmentRouter.use(authenticate);

// GET /api/v1/shipments
shipmentRouter.get(
  "/",
  validate(ShipmentQuerySchema, "query"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;
      const { page, limit, buyerId, status, complianceStatus } =
        req.query as Record<string, string | undefined>;

      const pageNum = Number(page ?? 1);
      const limitNum = Number(limit ?? 20);

      const where = {
        organizationId: orgId,
        ...(buyerId ? { buyerId } : {}),
        ...(status ? { status: status as "DRAFT" } : {}),
        ...(complianceStatus ? { complianceStatus: complianceStatus as "COMPLIANT" } : {}),
      };

      const [shipments, total] = await prisma.$transaction([
        prisma.shipment.findMany({
          where,
          include: {
            buyer: { select: { companyName: true, country: true } },
            _count: { select: { items: true } },
          },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: { createdAt: "desc" },
        }),
        prisma.shipment.count({ where }),
      ]);

      const body: ApiSuccess<typeof shipments> = {
        success: true,
        data: shipments,
        meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/shipments
shipmentRouter.post(
  "/",
  authorize("MILL_ADMIN", "EXPORT_MANAGER"),
  validate(CreateShipmentSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;
      const data = req.body as { buyerId: string; [key: string]: unknown };

      const buyer = await prisma.buyer.findFirst({
        where: { id: data.buyerId, organizationId: orgId },
      });
      if (!buyer) return next(Errors.notFound("Buyer"));

      const shipmentNumber = await nextSequenceNumber(orgId, "SHIPMENT");

      const shipment = await prisma.shipment.create({
        data: {
          shipmentNumber,
          organizationId: orgId,
          createdById: req.user!.id,
          ...data,
        },
        include: { buyer: { select: { companyName: true, country: true } } },
      });

      const body: ApiSuccess<typeof shipment> = { success: true, data: shipment };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/shipments/:id
shipmentRouter.get("/:id", (req: Request, res: Response) => getShipmentById(req, res));

// PATCH /api/v1/shipments/:id
shipmentRouter.patch(
  "/:id",
  authorize("MILL_ADMIN", "EXPORT_MANAGER"),
  validate(UpdateShipmentSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.shipment.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!existing) return next(Errors.notFound("Shipment"));

      const updateData = req.body as Record<string, unknown>;

      // Track due diligence confirmation
      if (updateData["dueDiligenceConfirmed"] === true && !existing.dueDiligenceConfirmed) {
        updateData["dueDiligenceConfirmedAt"] = new Date();
        updateData["dueDiligenceConfirmedBy"] = req.user!.id;
      }

      const shipment = await prisma.shipment.update({
        where: { id: req.params["id"] },
        data: updateData,
      });

      // Recalculate compliance score if due diligence changed
      if (updateData["dueDiligenceConfirmed"] !== undefined) {
        await calculateComplianceScore(shipment.id);
      }

      const body: ApiSuccess<typeof shipment> = { success: true, data: shipment };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/shipments/:id/items
shipmentRouter.post(
  "/:id/items",
  authorize("MILL_ADMIN", "EXPORT_MANAGER"),
  validate(AddShipmentItemSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;
      const { millingBatchId, weightKg } = req.body as { millingBatchId: string; weightKg: number };

      const shipment = await prisma.shipment.findFirst({
        where: { id: req.params["id"], organizationId: orgId },
      });
      if (!shipment) return next(Errors.notFound("Shipment"));

      if (shipment.status === "CERTIFICATE_ISSUED" || shipment.status === "SHIPPED") {
        return next(Errors.badRequest("Cannot modify a shipment after certificate has been issued"));
      }

      const batch = await prisma.millingBatch.findFirst({
        where: { id: millingBatchId, organizationId: orgId },
      });
      if (!batch) return next(Errors.notFound("Milling batch"));

      const item = await prisma.shipmentItem.create({
        data: { shipmentId: req.params["id"] as string, millingBatchId, weightKg },
        include: { millingBatch: { select: { batchNumber: true } } },
      });

      // Recalculate compliance score asynchronously
      calculateComplianceScore(req.params["id"]!).catch((err) =>
        console.error("Compliance recalculation failed:", err)
      );

      const body: ApiSuccess<typeof item> = { success: true, data: item };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/shipments/:id/items/:itemId
shipmentRouter.delete(
  "/:id/items/:itemId",
  authorize("MILL_ADMIN", "EXPORT_MANAGER"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const shipment = await prisma.shipment.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!shipment) return next(Errors.notFound("Shipment"));

      if (shipment.status !== "DRAFT" && shipment.status !== "UNDER_REVIEW") {
        return next(Errors.badRequest("Cannot remove items from a shipment in this status"));
      }

      await prisma.shipmentItem.deleteMany({
        where: { id: req.params["itemId"], shipmentId: req.params["id"] },
      });

      calculateComplianceScore(req.params["id"]!).catch(console.error);

      const body: ApiSuccess<{ removed: boolean }> = { success: true, data: { removed: true } };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/shipments/:id/due-diligence
shipmentRouter.patch(
  "/:id/due-diligence",
  authorize("MILL_ADMIN", "EXPORT_MANAGER"),
  async (req: Request, res: Response): Promise<void> => {
    await confirmDueDiligence(req, res);
  }
);

// GET /api/v1/shipments/:id/compliance
shipmentRouter.get(
  "/:id/compliance",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const shipment = await prisma.shipment.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!shipment) return next(Errors.notFound("Shipment"));

      const result = await calculateComplianceScore(req.params["id"]!);

      const body: ApiSuccess<typeof result> = { success: true, data: result };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/shipments/:id/certificate
shipmentRouter.post(
  "/:id/certificate",
  authorize("MILL_ADMIN", "EXPORT_MANAGER"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;
      const shipment = await prisma.shipment.findFirst({
        where: { id: req.params["id"], organizationId: orgId },
      });
      if (!shipment) return next(Errors.notFound("Shipment"));

      const COMPLIANCE_THRESHOLD = 60;
      if ((shipment.complianceScore ?? 0) < COMPLIANCE_THRESHOLD) {
        return next(
          Errors.badRequest(
            `Compliance score (${shipment.complianceScore ?? 0}) is below the minimum threshold of ${COMPLIANCE_THRESHOLD}`,
            "complianceScore"
          )
        );
      }

      // Generate official 3-page certificate with QR verification
      const certResult = await generateShipmentCertificate(req.params["id"]!, orgId);

      const body: ApiSuccess<{ certificateUrl: string; certificateNumber: string; message: string }> = {
        success: true,
        data: {
          certificateUrl: certResult.certificateUrl,
          certificateNumber: certResult.certificateNumber,
          message: "Certificate generated successfully and verified with cryptographic seal.",
        },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/shipments/:id/certificate/download
shipmentRouter.get(
  "/:id/certificate/download",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const shipment = await prisma.shipment.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
        select: { certificateUrl: true, shipmentNumber: true },
      });

      if (!shipment) return next(Errors.notFound("Shipment"));
      if (!shipment.certificateUrl) {
        return next(Errors.badRequest("Certificate has not been generated yet"));
      }

      // Redirect to the certificate URL (works for both local and S3)
      res.redirect(302, shipment.certificateUrl);
    } catch (err) {
      next(err);
    }
  }
);
