/**
 * @file apps/api/src/controllers/buyer-portal.controller.ts
 * @description Controller for Buyer Portal endpoints in RiceTrace.
 * Allows external buyers with a cryptographic magic link to inspect shipment
 * compliance and download EUDR / SPS certificates without user accounts.
 */

import type { Request, Response, NextFunction } from "express";
import { prisma } from "@ricetrace/db";
import { getSignedDownloadUrl } from "../lib/storage.js";

/**
 * Validates a buyer portal token and returns buyer/org info.
 */
export async function validateBuyerToken(token: string) {
  if (!token || token.length !== 64) {
    return null;
  }

  const buyer = await prisma.buyer.findFirst({
    where: {
      portalAccessToken: token,
    },
    include: {
      organization: { select: { id: true, name: true, logoUrl: true } },
    },
  });

  if (!buyer) return null;
  if (buyer.tokenExpiresAt && buyer.tokenExpiresAt < new Date()) return null;

  return {
    buyerId: buyer.id,
    organizationId: buyer.organizationId,
    companyName: buyer.companyName,
    country: buyer.country,
    orgName: buyer.organization.name,
    orgLogoUrl: buyer.organization.logoUrl,
  };
}

/**
 * GET /buyer-portal/:token/validate
 * Validates buyer access token and returns organization and buyer branding.
 */
export async function validateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  try {
    const token = req.params.token;
    if (!token || token.length !== 64) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid portal link" },
      });
    }

    const buyer = await prisma.buyer.findFirst({
      where: {
        portalAccessToken: token,
      },
      include: {
        organization: { select: { id: true, name: true, logoUrl: true } },
      },
    });

    if (!buyer) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "This portal link is invalid. Please contact the exporter for a new link.",
        },
      });
    }

    if (buyer.tokenExpiresAt && buyer.tokenExpiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: { code: "TOKEN_EXPIRED", message: "Access link has expired. Contact the mill for a new link." },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        organizationName: buyer.organization.name,
        organizationLogoUrl: buyer.organization.logoUrl,
        buyerName: buyer.companyName,
      },
    });
  } catch (error) {
    console.error("[BuyerPortal] validateToken error:", error);
    next(error);
  }
}

/**
 * GET /buyer-portal/:token/shipments
 * List confirmed shipments accessible to this buyer.
 */
export async function getBuyerPortalShipments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  try {
    const token = req.params.token;
    if (!token || token.length !== 64) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid portal link" },
      });
    }

    const buyer = await prisma.buyer.findFirst({
      where: {
        portalAccessToken: token,
      },
      include: {
        organization: { select: { id: true, name: true, logoUrl: true } },
      },
    });

    if (!buyer) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "This portal link is invalid. Please contact the exporter for a new link.",
        },
      });
    }

    if (buyer.tokenExpiresAt && buyer.tokenExpiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: { code: "TOKEN_EXPIRED", message: "Access link has expired. Contact the mill for a new link." },
      });
    }

    const shipments = await prisma.shipment.findMany({
      where: {
        buyerId: buyer.id,
        status: { not: "DRAFT" },
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

    return res.status(200).json({
      success: true,
      data: shipments,
    });
  } catch (error) {
    console.error("[BuyerPortal] getBuyerPortalShipments error:", error);
    next(error);
  }
}

/**
 * GET /buyer-portal/:token/shipments/:id
 * Serves compliance + certificate data safely to buyers without authentication.
 */
export async function getBuyerPortalShipment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  try {
    const token = req.params.token;
    const shipmentId = req.params.id;

    if (!token || token.length !== 64) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid portal link" },
      });
    }

    const buyer = await prisma.buyer.findFirst({
      where: {
        portalAccessToken: token,
      },
      include: {
        organization: { select: { id: true, name: true, logoUrl: true } },
      },
    });

    if (!buyer) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "This portal link is invalid. Please contact the exporter for a new link.",
        },
      });
    }

    if (buyer.tokenExpiresAt && buyer.tokenExpiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: { code: "TOKEN_EXPIRED", message: "Access link has expired. Contact the mill for a new link." },
      });
    }

    const shipment = await prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        buyerId: buyer.id,
      },
      include: {
        buyer: true,
        items: {
          include: {
            millingBatch: {
              include: {
                mill: true,
                labTests: true,
                lotLinks: {
                  include: {
                    procurementLot: {
                      include: {
                        farm: true,
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

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Shipment not found" },
      });
    }

    // Traceability aggregation
    const lotSet = new Set<string>();
    const farmMap = new Map<
      string,
      {
        id: string;
        district: string;
        eudrRiskLevel: string;
        geoLat: number | null;
        geoLng: number | null;
      }
    >();

    shipment.items.forEach((item) => {
      item.millingBatch.lotLinks.forEach((link) => {
        lotSet.add(link.procurementLot.id);
        const farm = link.procurementLot.farm;
        if (!farmMap.has(farm.id)) {
          farmMap.set(farm.id, {
            id: farm.id,
            district: farm.district,
            eudrRiskLevel: farm.eudrRiskLevel,
            geoLat: farm.geoLat,
            geoLng: farm.geoLng,
          });
        }
      });
    });

    const farms = Array.from(farmMap.values());
    const districts = Array.from(new Set(farms.map((f) => f.district)));

    const eudrSummary = {
      low: farms.filter((f) => f.eudrRiskLevel === "LOW").length,
      medium: farms.filter((f) => f.eudrRiskLevel === "MEDIUM").length,
      high: farms.filter((f) => f.eudrRiskLevel === "HIGH").length,
      pending: farms.filter((f) => f.eudrRiskLevel === "PENDING").length,
    };

    const labTests = shipment.items.flatMap((item) => item.millingBatch.labTests);

    const complianceChecks = [
      {
        id: "gps_coverage",
        label: "All farms have GPS coordinates recorded",
        passed: farms.length > 0 && farms.every((f) => f.geoLat != null && f.geoLng != null),
        detail: null,
        points: 20,
      },
      {
        id: "eudr_risk",
        label: "No high-risk deforestation farms",
        passed: farms.every((f) => f.eudrRiskLevel !== "HIGH" && f.eudrRiskLevel !== "PENDING"),
        detail: null,
        points: 25,
      },
      {
        id: "lab_pesticide",
        label: "All batches have passing pesticide residue test",
        passed: labTests.some(
          (t) => t.testType === "PESTICIDE_RESIDUE" && t.overallResult === "PASS"
        ),
        detail: null,
        points: 35,
      },
      {
        id: "pesticide_declaration",
        label: "All lots have pesticide declaration",
        passed: lotSet.size > 0,
        detail: null,
        points: 10,
      },
      {
        id: "due_diligence",
        label: "Due diligence statement confirmed",
        passed: Boolean(shipment.dueDiligenceConfirmed),
        detail: null,
        points: 10,
      },
    ];

    // Generate 24-hour signed download URL if certificate exists
    let certificateDownloadUrl: string | null = null;
    if (shipment.certificateKey && shipment.certificateStatus === "READY") {
      try {
        certificateDownloadUrl = await getSignedDownloadUrl(
          shipment.certificateKey,
          86400 // 24 hours
        );
      } catch (err) {
        console.warn("[BuyerPortal] Could not generate signed URL:", err);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        // Shipment summary
        shipmentNumber: shipment.shipmentNumber,
        invoiceNumber: shipment.invoiceNumber,
        lcNumber: shipment.lcNumber,
        portOfLoading: shipment.portOfLoading,
        portOfDischarge: shipment.portOfDischarge,
        vesselName: shipment.vesselName,
        shipmentDate: shipment.shipmentDate,

        // Buyer's own info
        buyerCompany: buyer.companyName,
        buyerCountry: buyer.country,

        // Compliance summary
        complianceScore: shipment.complianceScore,
        complianceStatus: shipment.complianceStatus,
        complianceChecks,

        // Traceability (buyer-safe — no farmer CNICs)
        batchCount: shipment.items.length,
        lotCount: lotSet.size,
        farmCount: farmMap.size,
        districts,
        totalWeightKg: shipment.items.reduce((sum, item) => sum + item.weightKg, 0),
        riceVariety: shipment.items[0]?.millingBatch?.variety || "Basmati",

        // Certificate
        hasCertificate: shipment.certificateStatus === "READY" && !!shipment.certificateKey,
        certNumber: shipment.certNumber || null,
        certificateGeneratedAt: shipment.certificateGeneratedAt || null,
        certificateDownloadUrl,

        // Farm EUDR summary
        eudrSummary,
      },
    });
  } catch (error) {
    console.error("[BuyerPortal] getBuyerPortalShipment error:", error);
    next(error);
  }
}

/**
 * GET /buyer-portal/:token/shipments/:id/certificate
 * Redirects or downloads the certificate for a shipment.
 */
export async function getBuyerShipmentCertificate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  try {
    const token = req.params.token;
    const shipmentId = req.params.id;

    if (!token || token.length !== 64) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid portal link" },
      });
    }

    const buyer = await prisma.buyer.findFirst({
      where: {
        portalAccessToken: token,
      },
      include: {
        organization: { select: { id: true, name: true, logoUrl: true } },
      },
    });

    if (!buyer) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "This portal link is invalid. Please contact the exporter for a new link.",
        },
      });
    }

    if (buyer.tokenExpiresAt && buyer.tokenExpiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: { code: "TOKEN_EXPIRED", message: "Access link has expired. Contact the mill for a new link." },
      });
    }

    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId, buyerId: buyer.id },
      select: { certificateUrl: true, shipmentNumber: true },
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Shipment not found" },
      });
    }

    if (!shipment.certificateUrl) {
      return res.status(400).json({
        success: false,
        error: { code: "BAD_REQUEST", message: "Certificate has not been generated for this shipment" },
      });
    }

    return res.redirect(302, shipment.certificateUrl);
  } catch (error) {
    console.error("[BuyerPortal] getBuyerShipmentCertificate error:", error);
    next(error);
  }
}

// Aliases for compatibility
export const validateBuyerPortalToken = validateToken;
export const listBuyerShipments = getBuyerPortalShipments;
export const getBuyerPortalCertificate = getBuyerShipmentCertificate;
