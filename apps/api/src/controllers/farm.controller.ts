/**
 * @file apps/api/src/controllers/farm.controller.ts
 * @description Controller for Farm operations in RiceTrace.
 * All farms belong to a farmer who belongs to an organization.
 * Scope ALL queries to req.user.organizationId via the farmer relation.
 */

import type { Request, Response } from "express";
import { prisma, Prisma, EudrRisk } from "@ricetrace/db";
import { eudrQueue } from "../lib/queue.js";
import { triggerEudrCheckForFarm } from "../services/eudr-check.service.js";
import { deleteFiles, extractKeyFromUrl } from "../lib/storage.js";

/**
 * GET /farms or GET /farmers/:farmerId/farms
 * List farms scoped to the authenticated organization with pagination
 * and filters by district, eudrRiskLevel, and optional farmerId.
 */
export async function listFarms(req: Request, res: Response): Promise<Response> {
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
    const district = typeof req.query.district === "string" ? req.query.district.trim() : undefined;
    const rawRisk = typeof req.query.eudrRiskLevel === "string" ? req.query.eudrRiskLevel.trim().toUpperCase() : undefined;
    const eudrRiskLevel = rawRisk && ["LOW", "MEDIUM", "HIGH", "PENDING"].includes(rawRisk)
      ? (rawRisk as EudrRisk)
      : undefined;

    const farmerIdParam = typeof req.params.farmerId === "string"
      ? req.params.farmerId
      : typeof req.params.id === "string"
        ? req.params.id
        : typeof req.query.farmerId === "string"
          ? req.query.farmerId.trim()
          : undefined;

    const where: Prisma.FarmWhereInput = {
      farmer: { organizationId: orgId },
      ...(farmerIdParam ? { farmerId: farmerIdParam } : {}),
      ...(district ? { district: { equals: district, mode: "insensitive" } } : {}),
      ...(eudrRiskLevel ? { eudrRiskLevel } : {}),
    };

    const [farms, total] = await Promise.all([
      prisma.farm.findMany({
        where,
        include: {
          farmer: {
            select: { id: true, name: true, cnic: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.farm.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: farms,
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
    console.error("[FarmController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * POST /farmers/:farmerId/farms or POST /farms
 * Create a new farm record under an existing farmer belonging to the authenticated organization.
 * Validates GPS coordinates and acreage, sets eudrRiskLevel to PENDING,
 * and enqueues an asynchronous background EUDR deforestation check.
 */
export async function createFarm(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const farmerId = (req.params.farmerId || req.params.id || req.body.farmerId) as string | undefined;

    if (!farmerId || typeof farmerId !== "string") {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "farmerId is required", field: "farmerId" },
      });
    }

    // Verify farmer exists and belongs to the authenticated organization
    const farmer = await prisma.farmer.findFirst({
      where: { id: farmerId, organizationId: orgId },
    });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Farmer not found in this organization" },
      });
    }

    const {
      name,
      areaAcres,
      geoLat,
      geoLng,
      geoPolygon,
      district,
      tehsil,
      landTitle,
      photoUrls,
    } = req.body;

    // Validate geoLat: between -90 and 90
    if (typeof geoLat !== "number" || isNaN(geoLat) || geoLat < -90 || geoLat > 90) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "geoLat must be a valid latitude number between -90 and 90",
          field: "geoLat",
        },
      });
    }

    // Validate geoLng: between -180 and 180
    if (typeof geoLng !== "number" || isNaN(geoLng) || geoLng < -180 || geoLng > 180) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "geoLng must be a valid longitude number between -180 and 180",
          field: "geoLng",
        },
      });
    }

    // Validate areaAcres: positive number
    if (typeof areaAcres !== "number" || isNaN(areaAcres) || areaAcres <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "areaAcres must be greater than 0",
          field: "areaAcres",
        },
      });
    }

    if (!district || typeof district !== "string" || district.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "district is required",
          field: "district",
        },
      });
    }

    // Create farm record with PENDING risk level
    const newFarm = await prisma.farm.create({
      data: {
        farmerId: farmer.id,
        name: name ? String(name).trim() : null,
        areaAcres: Number(areaAcres),
        geoLat: Number(geoLat),
        geoLng: Number(geoLng),
        geoPolygon: geoPolygon ?? Prisma.JsonNull,
        district: String(district).trim(),
        tehsil: tehsil ? String(tehsil).trim() : null,
        landTitle: landTitle ? String(landTitle).trim() : null,
        photoUrls: Array.isArray(photoUrls) ? photoUrls.filter((u): u is string => typeof u === "string") : [],
        eudrRiskLevel: "PENDING",
      },
    });

    // Enqueue EUDR check job in BullMQ (with fallback to direct async invocation)
    eudrQueue
      .add(
        "check-farm",
        { farmId: newFarm.id },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
        }
      )
      .catch((err: Error) => {
        console.error("[Farm] Failed to enqueue EUDR check job, falling back to direct async:", err.message);
        triggerEudrCheckForFarm(newFarm.id).catch((fallbackErr: unknown) =>
          console.error("[Farm] Fallback EUDR check failed:", fallbackErr)
        );
      });

    return res.status(201).json({
      success: true,
      data: {
        ...newFarm,
        eudrNote: "Deforestation risk check has been initiated and will complete shortly.",
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
    console.error("[FarmController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * GET /farms/:id or GET /farmers/:farmerId/farms/:id
 * Fetch detailed farm information including farmer details, recent lots,
 * lot count, and total procured weight.
 */
export async function getFarmById(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const farmId = (req.params.id || req.params.farmId) as string;

    const farm = await prisma.farm.findFirst({
      where: {
        id: farmId,
        farmer: { organizationId: orgId },
        ...(req.params.farmerId ? { farmerId: req.params.farmerId } : {}),
      },
      include: {
        farmer: {
          select: { id: true, name: true, cnic: true },
        },
        procurementLots: {
          orderBy: { dateReceived: "desc" },
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
        _count: {
          select: { procurementLots: true },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Farm not found" },
      });
    }

    const lotWeightSum = await prisma.procurementLot.aggregate({
      where: { farmId: farm.id },
      _sum: { weightKg: true },
    });

    return res.status(200).json({
      success: true,
      data: {
        ...farm,
        totalLotWeightKg: lotWeightSum._sum.weightKg ?? 0,
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
    console.error("[FarmController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * PATCH /farms/:id or PATCH /farmers/:farmerId/farms/:id
 * Partial update for a farm. Re-triggers EUDR deforestation check if GPS coordinates change.
 */
export async function updateFarm(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const farmId = (req.params.id || req.params.farmId) as string;

    const existingFarm = await prisma.farm.findFirst({
      where: {
        id: farmId,
        farmer: { organizationId: orgId },
        ...(req.params.farmerId ? { farmerId: req.params.farmerId } : {}),
      },
    });

    if (!existingFarm) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Farm not found" },
      });
    }

    const {
      name,
      areaAcres,
      geoLat,
      geoLng,
      geoPolygon,
      district,
      tehsil,
      landTitle,
      photoUrls,
    } = req.body;

    if (geoLat !== undefined && (typeof geoLat !== "number" || isNaN(geoLat) || geoLat < -90 || geoLat > 90)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "geoLat must be between -90 and 90", field: "geoLat" },
      });
    }

    if (geoLng !== undefined && (typeof geoLng !== "number" || isNaN(geoLng) || geoLng < -180 || geoLng > 180)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "geoLng must be between -180 and 180", field: "geoLng" },
      });
    }

    if (areaAcres !== undefined && (typeof areaAcres !== "number" || isNaN(areaAcres) || areaAcres <= 0)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "areaAcres must be greater than 0", field: "areaAcres" },
      });
    }

    const coordinatesChanged =
      (geoLat !== undefined && geoLat !== existingFarm.geoLat) ||
      (geoLng !== undefined && geoLng !== existingFarm.geoLng);

    const updateData: Prisma.FarmUpdateInput = {
      ...(name !== undefined ? { name: name ? String(name).trim() : null } : {}),
      ...(areaAcres !== undefined ? { areaAcres: Number(areaAcres) } : {}),
      ...(geoLat !== undefined ? { geoLat: Number(geoLat) } : {}),
      ...(geoLng !== undefined ? { geoLng: Number(geoLng) } : {}),
      ...(geoPolygon !== undefined ? { geoPolygon: geoPolygon ?? Prisma.JsonNull } : {}),
      ...(district !== undefined ? { district: String(district).trim() } : {}),
      ...(tehsil !== undefined ? { tehsil: tehsil ? String(tehsil).trim() : null } : {}),
      ...(landTitle !== undefined ? { landTitle: landTitle ? String(landTitle).trim() : null } : {}),
      ...(Array.isArray(photoUrls) ? { photoUrls } : {}),
    };

    let updatedFarm = await prisma.farm.update({
      where: { id: farmId },
      data: updateData,
    });

    if (coordinatesChanged) {
      // Reset to PENDING while check runs
      updatedFarm = await prisma.farm.update({
        where: { id: farmId },
        data: { eudrRiskLevel: "PENDING", eudrCheckedAt: null },
      });

      // Enqueue EUDR re-check job
      eudrQueue
        .add(
          "check-farm",
          { farmId },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
          }
        )
        .catch((err: Error) => {
          console.error("[Farm] Failed to enqueue re-check job, falling back to direct async:", err.message);
          triggerEudrCheckForFarm(farmId).catch((fallbackErr: unknown) =>
            console.error("[Farm] Fallback EUDR re-check failed:", fallbackErr)
          );
        });
    }

    return res.status(200).json({
      success: true,
      data: updatedFarm,
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
    console.error("[FarmController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * POST /farms/:id/eudr-check or POST /farmers/:farmerId/farms/:id/eudr-check
 * Manual re-trigger of EUDR check by Mill Admin.
 * Verifies GPS coordinates, resets status to PENDING, and enqueues check job.
 */
export async function retriggerEudrCheck(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    if (req.user.role !== "MILL_ADMIN") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only MILL_ADMIN can manually re-trigger EUDR checks" },
      });
    }

    const orgId = req.user.organizationId;
    const farmId = (req.params.id || req.params.farmId) as string;

    const farm = await prisma.farm.findFirst({
      where: {
        id: farmId,
        farmer: { organizationId: orgId },
        ...(req.params.farmerId ? { farmerId: req.params.farmerId } : {}),
      },
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Farm not found" },
      });
    }

    if (farm.geoLat === null || farm.geoLng === null) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_GPS",
          message: "Farm does not have GPS coordinates. Please update coordinates first.",
        },
      });
    }

    // Reset to PENDING
    await prisma.farm.update({
      where: { id: farmId },
      data: {
        eudrRiskLevel: "PENDING",
        eudrCheckedAt: null,
      },
    });

    // Enqueue EUDR check job
    eudrQueue
      .add(
        "check-farm",
        { farmId },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
        }
      )
      .catch((err: Error) => {
        console.error("[Farm] Failed to enqueue manual re-check, falling back to direct async:", err.message);
        triggerEudrCheckForFarm(farmId).catch((fallbackErr: unknown) =>
          console.error("[Farm] Fallback EUDR check failed:", fallbackErr)
        );
      });

    return res.status(200).json({
      success: true,
      data: {
        message: "EUDR check initiated",
        farmId,
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
    console.error("[FarmController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * DELETE /farms/:id or DELETE /farmers/:farmerId/farms/:id
 * Delete a farm and clean up all associated field photos in S3.
 */
export async function deleteFarm(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const farmId = (req.params.id || req.params.farmId) as string;

    const farm = await prisma.farm.findFirst({
      where: {
        id: farmId,
        farmer: { organizationId: orgId },
        ...(req.params.farmerId ? { farmerId: req.params.farmerId } : {}),
      },
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Farm not found" },
      });
    }

    // Clean up all farm photo files from S3
    if (farm.photoUrls && farm.photoUrls.length > 0) {
      const keysToDelete = farm.photoUrls
        .map((url) => extractKeyFromUrl(url))
        .filter((k): k is string => Boolean(k));
      await deleteFiles(keysToDelete);
    }

    // Now delete from DB
    await prisma.farm.delete({
      where: { id: farmId },
    });

    return res.status(200).json({
      success: true,
      data: { message: "Farm deleted successfully" },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Record not found" },
        });
      }
    }
    console.error("[FarmController] Delete error:", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}
