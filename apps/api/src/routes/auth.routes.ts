/**
 * @file apps/api/src/routes/auth.routes.ts
 * @description Authentication routes: login, token refresh, logout, current user.
 * Rate-limited separately from the global limiter to prevent brute-force attacks.
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authRateLimiter } from "../middleware/rate-limit.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { LoginSchema, RefreshTokenSchema } from "@ricetrace/validators";
import {
  login,
  refreshAccessToken,
  revokeRefreshToken,
} from "../services/auth.service.js";
import { prisma } from "@ricetrace/db";
import type { ApiSuccess } from "@ricetrace/types";

export const authRouter = Router();

// POST /api/v1/auth/login
authRouter.post(
  "/login",
  authRateLimiter,
  validate(LoginSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const userAgent = req.headers["user-agent"];
      const ipAddress = req.ip;

      const result = await login(email, password, userAgent, ipAddress);

      const body: ApiSuccess<typeof result> = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/auth/refresh
authRouter.post(
  "/refresh",
  validate(RefreshTokenSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body as { refreshToken: string };
      const result = await refreshAccessToken(refreshToken);

      const body: ApiSuccess<typeof result> = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/auth/logout
authRouter.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body as { refreshToken?: string };
      if (refreshToken) {
        await revokeRefreshToken(refreshToken);
      }
      const body: ApiSuccess<{ message: string }> = {
        success: true,
        data: { message: "Logged out successfully" },
      };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/auth/me
authRouter.get(
  "/me",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          language: true,
          organizationId: true,
          lastLoginAt: true,
          organization: { select: { name: true, slug: true, plan: true, logoUrl: true } },
        },
      });

      if (!user) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } });
        return;
      }

      const body: ApiSuccess<typeof user> = { success: true, data: user };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
);
