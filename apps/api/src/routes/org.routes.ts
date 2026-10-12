/**
 * @file apps/api/src/routes/org.routes.ts
 * @description Organization management API routes.
 * User management (invite, role change, deactivate) and mill CRUD.
 * All routes restricted to MILL_ADMIN.
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  CreateUserSchema,
  UpdateUserSchema,
  CreateMillSchema,
  UpdateMillSchema,
} from "@ricetrace/validators";
import { prisma } from "@ricetrace/db";
import { hashPassword } from "../services/auth.service.js";
import { Errors } from "../middleware/error.middleware.js";
import type { ApiSuccess } from "@ricetrace/types";
import crypto from "crypto";

export const orgRouter = Router();
orgRouter.use(authenticate);

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────

// GET /api/v1/org/users
orgRouter.get(
  "/users",
  authorize("MILL_ADMIN"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await prisma.user.findMany({
        where: { organizationId: req.user!.organizationId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          language: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });

      const body: ApiSuccess<typeof users> = { success: true, data: users };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/org/users — Invite (create) a new user
orgRouter.post(
  "/users",
  authorize("MILL_ADMIN"),
  validate(CreateUserSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.organizationId;
      const data = req.body as { email: string; name: string; role: string; language: string };

      // Check org plan limits (basic enforcement)
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { _count: { select: { users: true } } },
      });
      if (!org) return next(Errors.notFound("Organization"));

      const userLimits = { STARTER: 5, PROFESSIONAL: 15, ENTERPRISE: Infinity };
      const limit = userLimits[org.plan as keyof typeof userLimits] ?? 5;
      if (org._count.users >= limit) {
        return next(
          Errors.forbidden(
            `Your ${org.plan} plan allows a maximum of ${limit} users. Upgrade to add more.`
          )
        );
      }

      // Generate a temporary random password — user should change on first login
      const tempPassword = crypto.randomBytes(12).toString("hex");
      const passwordHash = await hashPassword(tempPassword);

      const user = await prisma.user.create({
        data: {
          organizationId: orgId,
          email: data.email.toLowerCase().trim(),
          passwordHash,
          name: data.name,
          role: data.role as "MILL_ADMIN",
          language: data.language as "EN",
        },
        select: {
          id: true, email: true, name: true, role: true, language: true, isActive: true,
        },
      });

      // In production: send a "set your password" email to the user
      // For MVP: return the temp password (remove before production!)
      const body: ApiSuccess<typeof user & { temporaryPassword: string }> = {
        success: true,
        data: { ...user, temporaryPassword: tempPassword },
      };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/org/users/:id
orgRouter.patch(
  "/users/:id",
  authorize("MILL_ADMIN"),
  validate(UpdateUserSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.user.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!existing) return next(Errors.notFound("User"));

      // Prevent admin from deactivating themselves
      if (req.params["id"] === req.user!.id && (req.body as { isActive?: boolean }).isActive === false) {
        return next(Errors.badRequest("You cannot deactivate your own account"));
      }

      const user = await prisma.user.update({
        where: { id: req.params["id"] },
        data: req.body as Record<string, unknown>,
        select: {
          id: true, email: true, name: true, role: true, language: true, isActive: true,
        },
      });

      const body: ApiSuccess<typeof user> = { success: true, data: user };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// ─── MILL MANAGEMENT ─────────────────────────────────────────────────────────

// GET /api/v1/org/mills
orgRouter.get(
  "/mills",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const mills = await prisma.mill.findMany({
        where: { organizationId: req.user!.organizationId },
        include: {
          _count: {
            select: { procurementLots: true, millingBatches: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      const body: ApiSuccess<typeof mills> = { success: true, data: mills };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/org/mills
orgRouter.post(
  "/mills",
  authorize("MILL_ADMIN"),
  validate(CreateMillSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const mill = await prisma.mill.create({
        data: {
          organizationId: req.user!.organizationId,
          ...(req.body as any),
        },
      });

      const body: ApiSuccess<typeof mill> = { success: true, data: mill };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/org/mills/:id
orgRouter.patch(
  "/mills/:id",
  authorize("MILL_ADMIN"),
  validate(UpdateMillSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.mill.findFirst({
        where: { id: req.params["id"], organizationId: req.user!.organizationId },
      });
      if (!existing) return next(Errors.notFound("Mill"));

      const mill = await prisma.mill.update({
        where: { id: req.params["id"] },
        data: req.body as Record<string, unknown>,
      });

      const body: ApiSuccess<typeof mill> = { success: true, data: mill };
      res.json(body);
    } catch (err) {
      next(err);
    }
  }
);
