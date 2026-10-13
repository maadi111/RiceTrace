/**
 * @file apps/api/src/routes/buyer-portal.routes.ts
 * @description Buyer Portal API routes — no JWT auth required.
 * Access is controlled via a cryptographic magic link token.
 * All routes are rate-limited per token to prevent abuse.
 */

import { Router } from "express";
import { buyerPortalRateLimiter } from "../middleware/rate-limit.middleware.js";
import {
  validateToken,
  getBuyerPortalShipments,
  getBuyerPortalShipment,
  getBuyerShipmentCertificate,
} from "../controllers/buyer-portal.controller.js";

export const buyerPortalRouter = Router();

// Apply rate limiting to all buyer portal routes
buyerPortalRouter.use("/:token", buyerPortalRateLimiter);

// GET /api/v1/buyer-portal/:token/validate
buyerPortalRouter.get("/:token/validate", validateToken);

// GET /api/v1/buyer-portal/:token/shipments
buyerPortalRouter.get("/:token/shipments", getBuyerPortalShipments);

// GET /api/v1/buyer-portal/:token/shipments/:id
buyerPortalRouter.get("/:token/shipments/:id", getBuyerPortalShipment);

// GET /api/v1/buyer-portal/:token/shipments/:id/certificate
buyerPortalRouter.get("/:token/shipments/:id/certificate", getBuyerShipmentCertificate);
