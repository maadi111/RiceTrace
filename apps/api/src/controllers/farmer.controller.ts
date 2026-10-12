/**
 * @file apps/api/src/controllers/farmer.controller.ts
 * @description Controller for Farmer operations in RiceTrace.
 * Handles listing, creating, fetching by ID, and updating farmers.
 * All operations are scoped to req.user.organizationId.
 */

import type { Request, Response } from "express";
import { prisma, Prisma } from "@ricetrace/db";
import {
  uploadFile,
  generateStorageKey,
  deleteFiles,
  extractKeyFromUrl,
} from "../lib/storage.js";

/**
 * GET /farmers
 * List farmers for the authenticated organization with pagination,
 * optional search across name/CNIC, and exact district filter.
 */
export async function listFarmers(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 20);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
    const district = typeof req.query.district === "string" ? req.query.district.trim() : undefined;

    const where: Prisma.FarmerWhereInput = {
      organizationId: orgId,
      ...(search
        ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { cnic: { contains: search } },
          ],
        }
        : {}),
      ...(district
        ? {
          district: { equals: district, mode: "insensitive" },
        }
        : {}),
    };

    const [farmers, total] = await Promise.all([
      prisma.farmer.findMany({
        where,
        include: {
          _count: {
            select: {
              farms: true,
              procurementLots: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.farmer.count({ where }),
    ]);

    const formattedFarmers = farmers.map((farmer) => ({
      ...farmer,
      farmsCount: farmer._count.farms,
      lotsCount: farmer._count.procurementLots,
    }));

    return res.status(200).json({
      success: true,
      data: formattedFarmers,
      meta: { page, limit, total },
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
    console.error("[FarmerController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * POST /farmers
 * Create a new farmer record.
 * Validates 13-digit CNIC and ensures no duplicate CNIC in the organization.
 */
export async function createFarmer(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const { cnic, name, fatherName, phone, village, union, tehsil, district, cnicPhotoUrl } = req.body;

    if (!cnic || typeof cnic !== "string" || !/^\d{13}$/.test(cnic.trim())) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "CNIC must be exactly 13 numeric digits",
          field: "cnic",
        },
      });
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Name is required",
          field: "name",
        },
      });
    }

    if (!district || typeof district !== "string" || district.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "District is required",
          field: "district",
        },
      });
    }

    const trimmedCnic = cnic.trim();

    // Check for duplicate CNIC within the organization
    const existingFarmer = await prisma.farmer.findUnique({
      where: {
        organizationId_cnic: {
          organizationId: orgId,
          cnic: trimmedCnic,
        },
      },
    });

    if (existingFarmer) {
      return res.status(409).json({
        success: false,
        error: {
          code: "DUPLICATE",
          message: "A farmer with this CNIC already exists in this organization",
          field: "cnic",
        },
      });
    }

    let farmer = await prisma.farmer.create({
      data: {
        organizationId: orgId,
        cnic: trimmedCnic,
        name: name.trim(),
        fatherName: fatherName ? String(fatherName).trim() : null,
        phone: phone ? String(phone).trim() : null,
        village: village ? String(village).trim() : null,
        union: union ? String(union).trim() : null,
        tehsil: tehsil ? String(tehsil).trim() : null,
        district: district.trim(),
        cnicPhotoUrl: cnicPhotoUrl ? String(cnicPhotoUrl) : null,
      },
    });

    if (req.file) {
      const key = generateStorageKey(
        'farmers/cnic/front',
        orgId,
        req.file.originalname
      );
      const uploadResult = await uploadFile({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        key,
        size: req.file.size,
        isPublic: false
      });
      farmer = await prisma.farmer.update({
        where: { id: farmer.id },
        data: {
          cnicFrontPhotoUrl: uploadResult.url,
          cnicPhotoUrl: uploadResult.url,
        }
      });
    }

    return res.status(201).json({
      success: true,
      data: farmer,
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
    console.error("[FarmerController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * GET /farmers/:id
 * Fetch farmer by ID scoped to authenticated user's organization.
 * Includes all farms with eudrRiskLevel, last 10 procurement lots, and total lot count.
 */
export async function getFarmerById(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const { id } = req.params;

    const farmer = await prisma.farmer.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
      include: {
        farms: {
          select: {
            id: true,
            farmerId: true,
            name: true,
            areaAcres: true,
            geoLat: true,
            geoLng: true,
            geoPolygon: true,
            district: true,
            tehsil: true,
            landTitle: true,
            eudrRiskLevel: true,
            eudrCheckedAt: true,
            photoUrls: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        procurementLots: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            procurementLots: true,
            farms: true,
          },
        },
      },
    });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Farmer not found" },
      });
    }

    const { _count, ...rest } = farmer;

    return res.status(200).json({
      success: true,
      data: {
        ...rest,
        totalLotsCount: _count.procurementLots,
        farmsCount: _count.farms,
        _count,
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
    console.error("[FarmerController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * PATCH /farmers/:id
 * Partial update for a farmer record.
 * Scoped to organizationId — 404 if not found or belongs to another organization.
 */
export async function updateFarmer(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const { id } = req.params;

    const existingFarmer = await prisma.farmer.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
    });

    if (!existingFarmer) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Farmer not found" },
      });
    }

    const updateData: Prisma.FarmerUpdateInput = {};
    if (req.body.name !== undefined) updateData.name = String(req.body.name).trim();
    if (req.body.fatherName !== undefined) {
      updateData.fatherName = req.body.fatherName ? String(req.body.fatherName).trim() : null;
    }
    if (req.body.phone !== undefined) {
      updateData.phone = req.body.phone ? String(req.body.phone).trim() : null;
    }
    if (req.body.village !== undefined) {
      updateData.village = req.body.village ? String(req.body.village).trim() : null;
    }
    if (req.body.union !== undefined) {
      updateData.union = req.body.union ? String(req.body.union).trim() : null;
    }
    if (req.body.tehsil !== undefined) {
      updateData.tehsil = req.body.tehsil ? String(req.body.tehsil).trim() : null;
    }
    if (req.body.district !== undefined) {
      updateData.district = String(req.body.district).trim();
    }
    if (req.body.cnicPhotoUrl !== undefined) {
      updateData.cnicPhotoUrl = req.body.cnicPhotoUrl ? String(req.body.cnicPhotoUrl) : null;
    }
    if (req.body.isVerified !== undefined) {
      updateData.isVerified = Boolean(req.body.isVerified);
    }

    const updatedFarmer = await prisma.farmer.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      data: updatedFarmer,
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
    console.error("[FarmerController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * DELETE /farmers/:id
 * Delete a farmer record and clean up associated CNIC photos in S3.
 */
export async function deleteFarmer(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const { id } = req.params;
    const orgId = req.user.organizationId;

    const farmer = await prisma.farmer.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Farmer not found" },
      });
    }

    // Clean up S3 files before deleting DB record
    const keysToDelete = [
      farmer.cnicFrontPhotoUrl,
      farmer.cnicBackPhotoUrl,
      farmer.cnicPhotoUrl,
    ]
      .filter((url): url is string => Boolean(url))
      .map((url) => extractKeyFromUrl(url))
      .filter((key): key is string => Boolean(key));

    await deleteFiles(keysToDelete);

    // Now delete from DB
    await prisma.farmer.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      data: { message: "Farmer deleted successfully" },
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
    console.error("[FarmerController] Delete error:", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}
