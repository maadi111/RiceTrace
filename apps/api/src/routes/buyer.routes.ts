/**
 * @file apps/api/src/routes/buyer.routes.ts
 * @description Buyer management API routes.
 * Implements magic link generation, portal access, and buyer CRUD.
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { CreateBuyerSchema, UpdateBuyerSchema } from "@ricetrace/validators";
import { prisma } from "@ricetrace/db";
import { env } from "../config/env.js";
import { Errors } from "../middleware/error.middleware.js";
import type { ApiSuccess } from "@ricetrace/types";

export const buyerRouter = Router();
buyerRouter.use(authenticate);
buyerRouter.use(authorize("MILL_ADMIN", "EXPORT_MANAGER"));

/** Creates a nodemailer transporter from env config */
function createMailTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    return null;
  }
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: env.SMTP_USER
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
  });
}

// GET /api/v1/buyers
buyerRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const buyers = await prisma.buyer.findMany({
        where: { organizationId: req.user!.organizationId },
        include: { _count: { select: { shipments: true } } },
        orderBy: { createdAt: "desc" },
      });

      const body: ApiSuccess<typeof buyers> = { success: true, data: buyers };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/buyers
buyerRouter.post(
  "/",
  validate(CreateBuyerSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const buyer = await prisma.buyer.create({
        data: {
          organizationId: req.user!.organizationId,
          ...(req.body as any),
        },
      });

      const body: ApiSuccess<typeof buyer> = { success: true, data: buyer };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/buyers/:id
buyerRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const buyer = await prisma.buyer.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
        include: {
          shipments: {
            select: {
              id: true,
              shipmentNumber: true,
              status: true,
              complianceStatus: true,
              complianceScore: true,
              shipmentDate: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!buyer) return next(Errors.notFound("Buyer"));

      // Never return the portal token hash in responses
      const { portalTokenHash: _, ...safebuyer } = buyer;
      const body: ApiSuccess<typeof safebuyer> = { success: true, data: safebuyer };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/buyers/:id
buyerRouter.patch(
  "/:id",
  validate(UpdateBuyerSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.buyer.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!existing) return next(Errors.notFound("Buyer"));

      const buyer = await prisma.buyer.update({
        where: { id: req.params["id"] },
        data: req.body as Record<string, unknown>,
      });

      const { portalTokenHash: _, ...safebuyer } = buyer;
      const body: ApiSuccess<typeof safebuyer> = { success: true, data: safebuyer };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/buyers/:id/portal-link — Generate or renew magic link
buyerRouter.post(
  "/:id/portal-link",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const buyer = await prisma.buyer.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!buyer) return next(Errors.notFound("Buyer"));

      // Generate cryptographically secure random token
      const rawToken = crypto.randomBytes(32).toString("hex"); // 64-char hex
      const tokenHash = await bcrypt.hash(rawToken, 10);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90); // 90-day expiry per spec

      await prisma.buyer.update({
        where: { id: req.params["id"] },
        data: {
          portalAccessToken: rawToken, // Store raw token for lookup (hash used for verification)
          portalTokenHash: tokenHash,
          tokenExpiresAt: expiresAt,
        },
      });

      const portalUrl = `${env.APP_URL}/buyer/${rawToken}`;

      const body: ApiSuccess<{ portalUrl: string; expiresAt: Date }> = {
        success: true,
        data: { portalUrl, expiresAt },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/buyers/:id/portal-link — Revoke portal access
buyerRouter.delete(
  "/:id/portal-link",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.buyer.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!existing) return next(Errors.notFound("Buyer"));

      await prisma.buyer.update({
        where: { id: req.params["id"] },
        data: {
          portalAccessToken: null,
          portalTokenHash: null,
          tokenExpiresAt: null,
        },
      });

      const body: ApiSuccess<{ revoked: boolean }> = {
        success: true,
        data: { revoked: true },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/buyers/:id/send-portal-link — Email magic link to buyer
buyerRouter.post(
  "/:id/send-portal-link",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const buyer = await prisma.buyer.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
        include: { organization: { select: { name: true } } },
      });
      if (!buyer) return next(Errors.notFound("Buyer"));
      if (!buyer.portalAccessToken || !buyer.tokenExpiresAt) {
        return next(
          Errors.badRequest(
            "No portal link exists for this buyer. Generate one first.",
            "portalLink"
          )
        );
      }
      if (buyer.tokenExpiresAt < new Date()) {
        return next(Errors.badRequest("Portal link has expired. Please regenerate it.", "portalLink"));
      }

      const transporter = createMailTransporter();
      if (!transporter) {
        return next(Errors.internal("Email service not configured"));
      }

      const portalUrl = `${env.APP_URL}/buyer/${buyer.portalAccessToken}`;

      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: buyer.contactEmail,
        subject: `Your Compliance Portal Access — ${buyer.organization.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a5276;">Rice Traceability Compliance Portal</h2>
            <p>Dear ${buyer.contactName ?? buyer.companyName},</p>
            <p>${buyer.organization.name} has shared their shipment compliance data with you.</p>
            <p>Click the button below to access your dedicated compliance portal:</p>
            <a href="${portalUrl}" style="
              display: inline-block;
              background-color: #1a5276;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 4px;
              margin: 16px 0;
            ">Access Compliance Portal</a>
            <p style="color: #7f8c8d; font-size: 12px;">
              This link expires on ${buyer.tokenExpiresAt.toLocaleDateString()}.
              If you did not expect this email, please disregard it.
            </p>
          </div>
        `,
      });

      const body: ApiSuccess<{ sent: boolean }> = { success: true, data: { sent: true } };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);
