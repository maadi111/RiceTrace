/**
 * @file apps/api/src/controllers/shipment.controller.ts
 * @description Controller for Shipment operations in RiceTrace.
 * Handles listing, creating, fetching by ID, adding/removing batches,
 * operator due diligence confirmation, and delegating compliance scoring
 * to the centralized compliance-score service and background queues.
 * All operations are scoped to req.user.organizationId.
 */

import type { Request, Response } from "express";
import { prisma, Prisma, ShipmentStatus, ComplianceStatus } from "@ricetrace/db";
import { calculateComplianceScore } from "../services/compliance-score.service.js";
import { complianceQueue, certificateQueue } from "../lib/queue.js";
import { getSignedDownloadUrl } from "../lib/storage.js";

/** Full nested include query for shipments to trace farm-to-shipment chain */
const shipmentTraceInclude = {
  buyer: true,
  items: {
    include: {
      millingBatch: {
        include: {
          labTests: true,
          lotLinks: {
            include: {
              procurementLot: {
                include: {
                  farmer: true,
                  farm: true,
                  pesticidesUsed: true,
                  fertilizersUsed: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * GET /shipments
 * List shipments with filters, pagination, buyer name/country,
 * batch counts, and compliance scores.
 */
export async function listShipments(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));

    const {
      buyerId,
      status,
      complianceStatus,
      portOfLoading,
      portOfDischarge,
      dateFrom,
      dateTo,
      search,
    } = req.query;

    const where: Prisma.ShipmentWhereInput = {
      organizationId: orgId,
      ...(buyerId && typeof buyerId === "string" ? { buyerId: buyerId.trim() } : {}),
      ...(status && typeof status === "string" ? { status: status.trim() as ShipmentStatus } : {}),
      ...(complianceStatus && typeof complianceStatus === "string"
        ? { complianceStatus: complianceStatus.trim() as ComplianceStatus }
        : {}),
      ...(portOfLoading && typeof portOfLoading === "string"
        ? { portOfLoading: { contains: portOfLoading.trim(), mode: "insensitive" } }
        : {}),
      ...(portOfDischarge && typeof portOfDischarge === "string"
        ? { portOfDischarge: { contains: portOfDischarge.trim(), mode: "insensitive" } }
        : {}),
      ...(search && typeof search === "string"
        ? {
          OR: [
            { shipmentNumber: { contains: search.trim(), mode: "insensitive" } },
            { invoiceNumber: { contains: search.trim(), mode: "insensitive" } },
            { lcNumber: { contains: search.trim(), mode: "insensitive" } },
            { billOfLadingNo: { contains: search.trim(), mode: "insensitive" } },
            { vesselName: { contains: search.trim(), mode: "insensitive" } },
          ],
        }
        : {}),
      ...(dateFrom || dateTo
        ? {
          shipmentDate: {
            ...(dateFrom && typeof dateFrom === "string" ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo && typeof dateTo === "string" ? { lte: new Date(dateTo) } : {}),
          },
        }
        : {}),
    };

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: {
          buyer: {
            select: {
              id: true,
              companyName: true,
              country: true,
              contactEmail: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.shipment.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: shipments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
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
    console.error("[ShipmentController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * POST /shipments
 * Create a new shipment with auto-generated shipment number format: SHP-YYYY-XXXXX.
 */
export async function createShipment(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const {
      buyerId,
      invoiceNumber,
      lcNumber,
      portOfLoading,
      portOfDischarge,
      vesselName,
      billOfLadingNo,
      shipmentDate,
      notes,
    } = req.body;

    if (!buyerId || typeof buyerId !== "string") {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "buyerId is required", field: "buyerId" },
      });
    }

    // Verify buyer exists and belongs to the authenticated organization
    const buyer = await prisma.buyer.findFirst({
      where: { id: buyerId, organizationId: orgId },
    });

    if (!buyer) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Buyer not found in this organization" },
      });
    }

    const currentYear = new Date().getFullYear();

    // Generate atomic shipment sequence number
    let shipmentNumber: string;
    try {
      const counter = await prisma.sequenceCounter.upsert({
        where: {
          organizationId_counterType_year: {
            organizationId: orgId,
            counterType: "SHIPMENT",
            year: currentYear,
          },
        },
        create: {
          organizationId: orgId,
          counterType: "SHIPMENT",
          year: currentYear,
          lastValue: 1,
        },
        update: {
          lastValue: { increment: 1 },
        },
      });
      shipmentNumber = `SHP-${currentYear}-${String(counter.lastValue).padStart(5, "0")}`;
    } catch {
      const nextSeq = await prisma.shipment.count({
        where: {
          organizationId: orgId,
          shipmentNumber: { startsWith: `SHP-${currentYear}-` },
        },
      });
      const allMatching = await prisma.shipment.findMany({
        where: {
          organizationId: orgId,
          shipmentNumber: { startsWith: `SHP-${currentYear}-` },
        },
        select: { shipmentNumber: true },
      });
      const maxSeq = allMatching.reduce((max, s) => {
        const parts = s.shipmentNumber.split("-");
        const val = parseInt(parts[2] ?? "0", 10);
        return isNaN(val) ? max : Math.max(max, val);
      }, nextSeq);
      shipmentNumber = `SHP-${currentYear}-${String(maxSeq + 1).padStart(5, "0")}`;
    }

    const shipment = await prisma.shipment.create({
      data: {
        shipmentNumber,
        organizationId: orgId,
        buyerId,
        createdById: req.user.id,
        invoiceNumber: invoiceNumber ? String(invoiceNumber).trim() : null,
        lcNumber: lcNumber ? String(lcNumber).trim() : null,
        portOfLoading: portOfLoading ? String(portOfLoading).trim() : null,
        portOfDischarge: portOfDischarge ? String(portOfDischarge).trim() : null,
        vesselName: vesselName ? String(vesselName).trim() : null,
        billOfLadingNo: billOfLadingNo ? String(billOfLadingNo).trim() : null,
        shipmentDate: shipmentDate ? new Date(shipmentDate) : null,
        notes: notes ? String(notes).trim() : null,
      },
      include: {
        buyer: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: shipment,
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
    console.error("[ShipmentController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * GET /shipments/:id
 * Full shipment detail including buyer, items, batches, lots, farms, farmers,
 * lab tests, and compliance score calculated via compliance-score service.
 */
export async function getShipmentById(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const { id } = req.params;

    const shipment = await prisma.shipment.findFirst({
      where: { id, organizationId: orgId },
      include: shipmentTraceInclude,
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Shipment not found" },
      });
    }

    // Calculate compliance score using single source of truth service
    const complianceResult = await calculateComplianceScore(shipment.id, orgId);

    return res.status(200).json({
      success: true,
      data: {
        ...shipment,
        complianceScore: complianceResult.score,
        complianceStatus: complianceResult.status,
        complianceChecks: complianceResult.checks,
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
    console.error("[ShipmentController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * POST /shipments/:id/items
 * Add a completed milling batch to the shipment.
 * Validates batch exists, belongs to org, and status is COMPLETED.
 * Creates ShipmentItem record, enqueues background recalculation job in complianceQueue,
 * and returns updated shipment with refreshed compliance result.
 */
export async function addBatchToShipment(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const { id } = req.params;
    const { millingBatchId, weightKg } = req.body;

    if (!millingBatchId || typeof millingBatchId !== "string") {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "millingBatchId is required", field: "millingBatchId" },
      });
    }

    if (typeof weightKg !== "number" || weightKg <= 0 || isNaN(weightKg)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "weightKg must be greater than 0", field: "weightKg" },
      });
    }

    // Verify shipment exists and belongs to org
    const shipment = await prisma.shipment.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Shipment not found" },
      });
    }

    // Verify batch exists and belongs to org
    const batch = await prisma.millingBatch.findFirst({
      where: { id: millingBatchId, organizationId: orgId },
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Milling batch not found in this organization" },
      });
    }

    // Validate batch status is COMPLETED
    if (batch.status !== "COMPLETED") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_BATCH_STATUS",
          message: `Cannot add batch with status ${batch.status}. Only COMPLETED batches can be added to a shipment.`,
          field: "millingBatchId",
        },
      });
    }

    // Create or update ShipmentItem
    await prisma.shipmentItem.upsert({
      where: {
        shipmentId_millingBatchId: {
          shipmentId: id,
          millingBatchId,
        },
      },
      create: {
        shipmentId: id,
        millingBatchId,
        weightKg,
      },
      update: {
        weightKg,
      },
    });

    // Enqueue background compliance recalculation via BullMQ
    complianceQueue
      .add(
        "recalculate",
        { shipmentId: shipment.id, organizationId: orgId },
        { attempts: 2, backoff: { type: "fixed", delay: 2000 } }
      )
      .catch((err: Error) => {
        console.error("[Shipment] Failed to enqueue compliance recalculation:", err.message);
      });

    // Immediate calculation for live HTTP response
    const complianceResult = await calculateComplianceScore(shipment.id, orgId);

    // Fetch refreshed shipment with full traceability chain
    const updatedShipment = await prisma.shipment.findFirst({
      where: { id, organizationId: orgId },
      include: shipmentTraceInclude,
    });

    if (!updatedShipment) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Shipment not found" },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...updatedShipment,
        complianceScore: complianceResult.score,
        complianceStatus: complianceResult.status,
        complianceChecks: complianceResult.checks,
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
    console.error("[ShipmentController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * DELETE /shipments/:id/items/:itemId
 * Remove a batch item from a shipment.
 * Deletes the ShipmentItem, recalculates compliance score via service,
 * and returns updated shipment.
 */
export async function removeBatchFromShipment(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const { id, itemId } = req.params;

    const item = await prisma.shipmentItem.findFirst({
      where: {
        id: itemId,
        shipmentId: id,
        shipment: {
          organizationId: orgId,
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Shipment item not found" },
      });
    }

    await prisma.shipmentItem.delete({
      where: { id: itemId },
    });

    // Enqueue background compliance recalculation via BullMQ
    complianceQueue
      .add(
        "recalculate",
        { shipmentId: id, organizationId: orgId },
        { attempts: 2, backoff: { type: "fixed", delay: 2000 } }
      )
      .catch((err: Error) => {
        console.error("[Shipment] Failed to enqueue compliance recalculation:", err.message);
      });

    // Immediate calculation for live HTTP response
    const complianceResult = await calculateComplianceScore(id, orgId);

    // Fetch refreshed shipment with full traceability chain
    const updatedShipment = await prisma.shipment.findFirst({
      where: { id, organizationId: orgId },
      include: shipmentTraceInclude,
    });

    if (!updatedShipment) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Shipment not found" },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...updatedShipment,
        complianceScore: complianceResult.score,
        complianceStatus: complianceResult.status,
        complianceChecks: complianceResult.checks,
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
    console.error("[ShipmentController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * PATCH /shipments/:id/due-diligence
 * Confirm operator due diligence statement for EUDR compliance.
 * Restricted to EXPORT_MANAGER and MILL_ADMIN roles.
 * Recalculates compliance score and returns updated shipment.
 */
export async function confirmDueDiligence(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    if (req.user.role !== "EXPORT_MANAGER" && req.user.role !== "MILL_ADMIN") {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Only EXPORT_MANAGER and MILL_ADMIN can confirm due diligence",
        },
      });
    }

    const orgId = req.user.organizationId;
    const { id } = req.params;

    const existingShipment = await prisma.shipment.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existingShipment) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Shipment not found" },
      });
    }

    // Set due diligence confirmation attributes
    await prisma.shipment.update({
      where: { id },
      data: {
        dueDiligenceConfirmed: true,
        dueDiligenceConfirmedAt: new Date(),
        dueDiligenceConfirmedBy: req.user.name || req.user.id,
      },
    });

    // Recalculate compliance score
    const complianceResult = await calculateComplianceScore(id, orgId);

    // Fetch refreshed shipment with full traceability chain
    const updatedShipment = await prisma.shipment.findFirst({
      where: { id, organizationId: orgId },
      include: shipmentTraceInclude,
    });

    if (!updatedShipment) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Shipment not found" },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...updatedShipment,
        complianceScore: complianceResult.score,
        complianceStatus: complianceResult.status,
        complianceChecks: complianceResult.checks,
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
    console.error("[ShipmentController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

// ─── CERTIFICATE ENDPOINTS ───────────────────────────────────────────────────

/**
 * POST /shipments/:id/certificate
 * Queue generation of traceability certificate
 */
export async function requestCertificateGeneration(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
      return;
    }

    // Only EXPORT_MANAGER and MILL_ADMIN
    if (!['EXPORT_MANAGER', 'MILL_ADMIN'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient role' }
      });
      return;
    }

    const shipment = await prisma.shipment.findFirst({
      where: { id, organizationId: req.user.organizationId }
    });

    if (!shipment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Shipment not found' }
      });
      return;
    }

    // Block if compliance score is below threshold
    const threshold = 60;
    if ((shipment.complianceScore ?? 0) < threshold) {
      res.status(400).json({
        success: false,
        error: {
          code: 'COMPLIANCE_INSUFFICIENT',
          message: `Compliance score ${shipment.complianceScore ?? 0}/100 is below the minimum threshold of ${threshold} required to generate a certificate.`
        }
      });
      return;
    }

    // Block if already generating
    if (shipment.certificateStatus === 'GENERATING') {
      res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_GENERATING',
          message: 'Certificate generation is already in progress'
        }
      });
      return;
    }

    // Enqueue the job
    const job = await certificateQueue.add(
      'generate',
      { shipmentId: id, organizationId: req.user.organizationId },
      {
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50
      }
    );

    res.status(202).json({
      success: true,
      data: {
        jobId: job.id,
        shipmentId: id,
        status: 'GENERATING',
        message: 'Certificate generation has been queued. Poll /shipments/:id/certificate/status for updates.',
        statusUrl: `/api/v1/shipments/${id}/certificate/status`
      }
    });
  } catch (error) {
    console.error('[Shipment] Certificate request error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Internal server error' }
    });
  }
}

/**
 * GET /shipments/:id/certificate/status
 * Check certificate generation status
 */
export async function getCertificateStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
      return;
    }

    const shipment = await prisma.shipment.findFirst({
      where: { id, organizationId: req.user.organizationId },
      select: {
        id: true,
        certNumber: true,
        certificateStatus: true,
        certificateGeneratedAt: true,
        certificateUrl: true
      }
    });

    if (!shipment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Shipment not found' }
      });
      return;
    }

    const status = shipment.certificateStatus || 'NONE';

    res.status(200).json({
      success: true,
      data: {
        shipmentId: id,
        status, // NONE | GENERATING | READY | FAILED
        certNumber: shipment.certNumber || null,
        generatedAt: shipment.certificateGeneratedAt || null,
        hasDownload: status === 'READY',
        downloadUrl:
          status === 'READY'
            ? `/api/v1/shipments/${id}/certificate/download`
            : null
      }
    });
  } catch (error) {
    console.error('[Shipment] Certificate status error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Internal server error' }
    });
  }
}

/**
 * GET /shipments/:id/certificate/download
 * Download certificate via signed S3 redirect
 */
export async function downloadCertificate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
      return;
    }

    const shipment = await prisma.shipment.findFirst({
      where: { id, organizationId: req.user.organizationId },
      select: {
        certNumber: true,
        certificateKey: true,
        certificateStatus: true
      }
    });

    if (!shipment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Shipment not found' }
      });
      return;
    }

    if (shipment.certificateStatus !== 'READY' || !shipment.certificateKey) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CERTIFICATE_NOT_READY',
          message: 'Certificate has not been generated yet'
        }
      });
      return;
    }

    // Generate a 1-hour signed URL and redirect
    const signedUrl = await getSignedDownloadUrl(
      shipment.certificateKey,
      3600
    );

    res.redirect(302, signedUrl);
  } catch (error) {
    console.error('[Shipment] Certificate download error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Internal server error' }
    });
  }
}
