/**
 * @file apps/api/src/routes/buyer-portal.routes.ts
 * @description Buyer Portal API routes — no JWT auth required.
 * Access is controlled via a cryptographic magic link token.
 * All routes are rate-limited per token to prevent abuse.
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "@ricetrace/db";
import { Errors } from "../middleware/error.middleware.js";
import { buyerPortalRateLimiter } from "../middleware/rate-limit.middleware.js";
import type { ApiSuccess } from "@ricetrace/types";
import { getBuyerPortalShipment } from "../controllers/buyer-portal.controller.js";

export const buyerPortalRouter = Router();

// Apply rate limiting to all buyer portal routes
buyerPortalRouter.use("/:token", buyerPortalRateLimiter);

/**
 * Validates a buyer portal token and returns buyer/org info.
 * Called on every buyer portal page load to verify the link is still valid.
 */
async function validateBuyerToken(
  token: string
): Promise<{ buyerId: string; organizationId: string; companyName: string; orgName: string; orgLogoUrl: string | null }> {
  if (!token || token.length !== 64) {
    throw Errors.unauthorized("Invalid portal link");
  }

  const buyer = await prisma.buyer.findFirst({
    where: {
      portalAccessToken: token,
      tokenExpiresAt: { gt: new Date() },
    },
    include: {
      organization: { select: { id: true, name: true, logoUrl: true } },
    },
  });

  if (!buyer) {
    throw Errors.unauthorized(
      "This portal link is invalid or has expired. Please contact the exporter for a new link."
    );
  }

  return {
    buyerId: buyer.id,
    organizationId: buyer.organizationId,
    companyName: buyer.companyName,
    orgName: buyer.organization.name,
    orgLogoUrl: buyer.organization.logoUrl,
  };
}

// GET /api/v1/buyer-portal/:token/validate
buyerPortalRouter.get(
  "/:token/validate",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const info = await validateBuyerToken(req.params["token"]!);

      const body: ApiSuccess<{
        organizationName: string;
        organizationLogoUrl: string | null;
        buyerName: string;
      }> = {
        success: true,
        data: {
          organizationName: info.orgName,
          organizationLogoUrl: info.orgLogoUrl,
          buyerName: info.companyName,
        },
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/buyer-portal/:token/shipments
buyerPortalRouter.get(
  "/:token/shipments",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { buyerId } = await validateBuyerToken(req.params["token"]!);

      const shipments = await prisma.shipment.findMany({
        where: {
          buyerId,
          status: { not: "DRAFT" },  // Buyers only see confirmed shipments
        },
        select: {
          id: true,
          shipmentNumber: true,
          status: true,
          complianceStatus: true,
          complianceScore: true,
          shipmentDate: true,
          portOfLoading: true,
          portOfDischarge: true,
          certificateUrl: true,
          certificateGeneratedAt: true,
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const body: ApiSuccess<typeof shipments> = { success: true, data: shipments };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/buyer-portal/:token/shipments/:id
buyerPortalRouter.get("/:token/shipments/:id", getBuyerPortalShipment);

// GET /api/v1/buyer-portal/:token/shipments/:id/certificate
buyerPortalRouter.get(
  "/:token/shipments/:id/certificate",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { buyerId } = await validateBuyerToken(req.params["token"]!);

      const shipment = await prisma.shipment.findFirst({
        where: { id: req.params["id"], buyerId },
        select: { certificateUrl: true, shipmentNumber: true },
      });

      if (!shipment) return next(Errors.notFound("Shipment"));
      if (!shipment.certificateUrl) {
        return next(Errors.badRequest("Certificate has not been generated for this shipment"));
      }

      res.redirect(302, shipment.certificateUrl);
    } catch (err) {
      next(err);
    }
  }
);
