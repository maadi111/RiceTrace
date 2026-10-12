/**
 * @file apps/api/src/middleware/auth.middleware.ts
 * @description JWT authentication and role-based access control middleware.
 * Verifies access tokens on protected routes and enforces UserRole permissions.
 */

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { Errors } from "./error.middleware.js";
import type { JwtPayload, UserRole, AuthUser } from "@ricetrace/types";

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      params: Record<string, string>;
    }
  }
}

/**
 * Middleware: verifies the Bearer token in the Authorization header.
 * Attaches the decoded user payload to `req.user`.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(Errors.unauthorized("Missing or malformed Authorization header"));
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = {
      id: payload.sub,
      email: "",  // Not stored in access token for size; fetch from DB if needed
      name: "",
      role: payload.role,
      organizationId: payload.orgId,
      language: "EN",
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(Errors.unauthorized("Access token has expired"));
    }
    return next(Errors.unauthorized("Invalid access token"));
  }
}

/**
 * Middleware factory: restricts access to users with specific roles.
 * Must be used AFTER `authenticate`.
 *
 * @example
 * router.post('/lots', authenticate, authorize('MILL_ADMIN', 'PROCUREMENT_OFFICER'), createLot);
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(Errors.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        Errors.forbidden(
          `Role '${req.user.role}' is not authorized to perform this action`
        )
      );
    }
    next();
  };
}

/**
 * Role requirement helper accepting an array of roles.
 */
export const requireRole = (roles: UserRole[]) => authorize(...roles);

/**
 * Middleware: ensures the authenticated user belongs to the same org
 * as the resource being accessed (multi-tenant isolation).
 * Reads `req.resourceOrgId` — routes must set this before calling.
 */
export function ensureSameOrg(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const resourceOrgId = (req as Request & { resourceOrgId?: string })
    .resourceOrgId;
  if (resourceOrgId && req.user?.organizationId !== resourceOrgId) {
    return next(Errors.forbidden("Access to this resource is not permitted"));
  }
  next();
}
