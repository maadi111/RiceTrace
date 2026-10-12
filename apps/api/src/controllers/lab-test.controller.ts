/**
 * @file apps/api/src/controllers/lab-test.controller.ts
 * @description Controller for Lab Test operations in RiceTrace.
 * Handles listing, creating, fetching by ID, and updating lab tests.
 * Automatically puts milling batch on QUALITY_HOLD if test fails.
 * All operations are scoped to req.user.organizationId.
 */

import type { Request, Response } from "express";
import { prisma, Prisma, LabTestType, LabResult } from "@ricetrace/db";
import { deleteFiles, extractKeyFromUrl } from "../lib/storage.js";

/**
 * GET /lab-tests
 * List lab tests with filters, pagination, batch number, and mill name.
 */
export async function listLabTests(req: Request, res: Response): Promise<Response> {
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

    const { millingBatchId, batchId, testType, overallResult, result } = req.query;

    const actualBatchId = (millingBatchId ?? batchId) as string | undefined;
    const actualResult = (overallResult ?? result) as string | undefined;

    const where: Prisma.LabTestWhereInput = {
      organizationId: orgId,
      ...(actualBatchId && typeof actualBatchId === "string" ? { millingBatchId: actualBatchId } : {}),
      ...(testType && typeof testType === "string" && Object.values(LabTestType).includes(testType as LabTestType)
        ? { testType: testType as LabTestType }
        : {}),
      ...(actualResult && typeof actualResult === "string" && Object.values(LabResult).includes(actualResult as LabResult)
        ? { overallResult: actualResult as LabResult }
        : {}),
    };

    const [tests, total] = await Promise.all([
      prisma.labTest.findMany({
        where,
        include: {
          millingBatch: {
            select: {
              id: true,
              batchNumber: true,
              mill: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { testDate: "desc" },
      }),
      prisma.labTest.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: tests,
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
    console.error("[LabTestController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * POST /lab-tests
 * Create a new lab test record.
 * Validates millingBatchId belongs to org.
 * If overallResult is FAIL, automatically updates parent millingBatch status to QUALITY_HOLD.
 */
export async function createLabTest(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const {
      millingBatchId,
      testType,
      labName,
      testDate,
      reportNumber,
      certificateUrl,
      moisturePercent,
      brokenPercent,
      chalkyPercent,
      foreignMatterPercent,
      pesticideResult,
      heavyMetalResult,
      mycotoxinResult,
      customResults,
      overallResult = "PENDING",
      notes,
    } = req.body;

    if (!millingBatchId || typeof millingBatchId !== "string") {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "millingBatchId is required", field: "millingBatchId" },
      });
    }

    if (!testType || typeof testType !== "string" || !Object.values(LabTestType).includes(testType as LabTestType)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Valid testType is required", field: "testType" },
      });
    }

    if (!labName || typeof labName !== "string" || labName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "labName is required", field: "labName" },
      });
    }

    if (!testDate) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "testDate is required", field: "testDate" },
      });
    }

    const finalResult = Object.values(LabResult).includes(overallResult as LabResult)
      ? (overallResult as LabResult)
      : "PENDING";

    // Validate millingBatch exists and belongs to the authenticated user's organization
    const batch = await prisma.millingBatch.findFirst({
      where: { id: millingBatchId, organizationId: orgId },
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Milling batch not found in this organization" },
      });
    }

    const labTest = await prisma.$transaction(async (tx) => {
      const created = await tx.labTest.create({
        data: {
          organizationId: orgId,
          millingBatchId,
          createdById: req.user!.id,
          testType: testType as LabTestType,
          labName: String(labName).trim(),
          testDate: new Date(testDate),
          reportNumber: reportNumber ? String(reportNumber).trim() : null,
          certificateUrl: certificateUrl ? String(certificateUrl).trim() : null,
          moisturePercent: moisturePercent !== undefined && moisturePercent !== null ? Number(moisturePercent) : null,
          brokenPercent: brokenPercent !== undefined && brokenPercent !== null ? Number(brokenPercent) : null,
          chalkyPercent: chalkyPercent !== undefined && chalkyPercent !== null ? Number(chalkyPercent) : null,
          foreignMatterPercent:
            foreignMatterPercent !== undefined && foreignMatterPercent !== null ? Number(foreignMatterPercent) : null,
          pesticideResult: pesticideResult ? String(pesticideResult).trim() : null,
          heavyMetalResult: heavyMetalResult ? String(heavyMetalResult).trim() : null,
          mycotoxinResult: mycotoxinResult ? String(mycotoxinResult).trim() : null,
          customResults: customResults && typeof customResults === "object" ? customResults : Prisma.DbNull,
          overallResult: finalResult,
          notes: notes ? String(notes).trim() : null,
        },
        include: {
          millingBatch: {
            select: {
              id: true,
              batchNumber: true,
              mill: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (finalResult === "FAIL") {
        await tx.millingBatch.update({
          where: { id: millingBatchId },
          data: { status: "QUALITY_HOLD" },
        });
      }

      return created;
    });

    return res.status(201).json({
      success: true,
      data: labTest,
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
    console.error("[LabTestController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * GET /lab-tests/:id
 * Fetch lab test by ID scoped to organization.
 * Includes millingBatch and mill name.
 */
export async function getLabTestById(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const { id } = req.params;

    const test = await prisma.labTest.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
      include: {
        millingBatch: {
          select: {
            id: true,
            batchNumber: true,
            status: true,
            variety: true,
            mill: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Lab test not found" },
      });
    }

    return res.status(200).json({
      success: true,
      data: test,
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
    console.error("[LabTestController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * PATCH /lab-tests/:id
 * Partial update for a lab test.
 * If overallResult is updated to FAIL, automatically updates parent millingBatch to QUALITY_HOLD.
 */
export async function updateLabTest(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const orgId = req.user.organizationId;
    const { id } = req.params;

    const existingTest = await prisma.labTest.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existingTest) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Lab test not found" },
      });
    }

    const updateData: Prisma.LabTestUpdateInput = {};
    if (req.body.labName !== undefined) updateData.labName = String(req.body.labName).trim();
    if (req.body.testDate !== undefined) updateData.testDate = new Date(req.body.testDate);
    if (req.body.reportNumber !== undefined) {
      updateData.reportNumber = req.body.reportNumber ? String(req.body.reportNumber).trim() : null;
    }
    if (req.body.certificateUrl !== undefined) {
      updateData.certificateUrl = req.body.certificateUrl ? String(req.body.certificateUrl).trim() : null;
    }
    if (req.body.moisturePercent !== undefined) {
      updateData.moisturePercent = req.body.moisturePercent !== null ? Number(req.body.moisturePercent) : null;
    }
    if (req.body.brokenPercent !== undefined) {
      updateData.brokenPercent = req.body.brokenPercent !== null ? Number(req.body.brokenPercent) : null;
    }
    if (req.body.chalkyPercent !== undefined) {
      updateData.chalkyPercent = req.body.chalkyPercent !== null ? Number(req.body.chalkyPercent) : null;
    }
    if (req.body.foreignMatterPercent !== undefined) {
      updateData.foreignMatterPercent =
        req.body.foreignMatterPercent !== null ? Number(req.body.foreignMatterPercent) : null;
    }
    if (req.body.pesticideResult !== undefined) {
      updateData.pesticideResult = req.body.pesticideResult ? String(req.body.pesticideResult).trim() : null;
    }
    if (req.body.heavyMetalResult !== undefined) {
      updateData.heavyMetalResult = req.body.heavyMetalResult ? String(req.body.heavyMetalResult).trim() : null;
    }
    if (req.body.mycotoxinResult !== undefined) {
      updateData.mycotoxinResult = req.body.mycotoxinResult ? String(req.body.mycotoxinResult).trim() : null;
    }
    if (req.body.customResults !== undefined) {
      updateData.customResults =
        req.body.customResults && typeof req.body.customResults === "object"
          ? req.body.customResults
          : Prisma.DbNull;
    }
    if (req.body.overallResult !== undefined && Object.values(LabResult).includes(req.body.overallResult as LabResult)) {
      updateData.overallResult = req.body.overallResult as LabResult;
    }
    if (req.body.notes !== undefined) {
      updateData.notes = req.body.notes ? String(req.body.notes).trim() : null;
    }

    const updatedTest = await prisma.$transaction(async (tx) => {
      const updated = await tx.labTest.update({
        where: { id },
        data: updateData,
        include: {
          millingBatch: {
            select: {
              id: true,
              batchNumber: true,
              status: true,
              mill: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (req.body.overallResult === "FAIL") {
        await tx.millingBatch.update({
          where: { id: existingTest.millingBatchId },
          data: { status: "QUALITY_HOLD" },
        });
      }

      return updated;
    });

    return res.status(200).json({
      success: true,
      data: updatedTest,
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
    console.error("[LabTestController]", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}

/**
 * DELETE /lab-tests/:id
 * Delete a lab test record and clean up any certificate PDF stored in S3.
 */
export async function deleteLabTest(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const { id } = req.params;
    const orgId = req.user.organizationId;

    const labTest = await prisma.labTest.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!labTest) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Lab test not found" },
      });
    }

    // Clean up S3 certificate if exists
    if (labTest.certificateUrl) {
      const key = extractKeyFromUrl(labTest.certificateUrl);
      if (key) {
        await deleteFiles([key]);
      }
    }

    // Delete from DB
    await prisma.labTest.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      data: { message: "Lab test deleted successfully" },
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
    console.error("[LabTestController] Delete error:", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });
  }
}
