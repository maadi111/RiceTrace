/**
 * @file apps/api/src/middleware/error.middleware.ts
 * @description Centralised error handler and 404 handler for Express.
 * All errors thrown anywhere in the app flow through here.
 * Produces consistent JSON error shapes matching the API spec.
 */

import type { Request, Response, NextFunction } from "express";
import type { ApiError } from "@ricetrace/types";
import { ZodError } from "zod";

// Custom application error class
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = "AppError";
    // Restore prototype chain in transpiled output
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Helper factories for common errors
export const Errors = {
  badRequest: (message: string, field?: string) =>
    new AppError(400, "BAD_REQUEST", message, field),
  unauthorized: (message = "Unauthorized") =>
    new AppError(401, "UNAUTHORIZED", message),
  forbidden: (message = "Forbidden") =>
    new AppError(403, "FORBIDDEN", message),
  notFound: (resource: string) =>
    new AppError(404, "NOT_FOUND", `${resource} not found`),
  conflict: (message: string, field?: string) =>
    new AppError(409, "CONFLICT", message, field),
  unprocessable: (message: string, field?: string) =>
    new AppError(422, "VALIDATION_ERROR", message, field),
  internal: (message = "Internal server error") =>
    new AppError(500, "INTERNAL_ERROR", message),
};

/** 404 handler — must be registered AFTER all routes */
export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiError = {
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Cannot ${req.method} ${req.path}`,
    },
  };
  res.status(404).json(body);
}

/** Global error handler — must have 4 parameters (Express signature) */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Zod validation errors — convert to 422
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const body: ApiError = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: firstIssue?.message ?? "Validation failed",
        field: firstIssue?.path.join("."),
      },
    };
    res.status(422).json(body);
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    const body: ApiError = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.field && { field: err.field }),
      },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // Prisma unique constraint violation
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  ) {
    const prismaErr = err as { meta?: { target?: string[] } };
    const field = prismaErr.meta?.target?.[0];
    const body: ApiError = {
      success: false,
      error: {
        code: "CONFLICT",
        message: "A record with this value already exists",
        ...(field && { field }),
      },
    };
    res.status(409).json(body);
    return;
  }

  // Unknown errors — log and return generic message (don't leak stack traces)
  console.error("[Unhandled Error]", err);
  const body: ApiError = {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  };
  res.status(500).json(body);
}
