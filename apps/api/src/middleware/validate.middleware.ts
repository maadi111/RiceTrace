/**
 * @file apps/api/src/middleware/validate.middleware.ts
 * @description Request body/query/params validation middleware using Zod.
 * Validates and parses the request data, replacing it with the parsed result
 * so downstream handlers receive correctly typed inputs.
 */

import type { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { Errors } from "./error.middleware.js";

type RequestPart = "body" | "query" | "params";

/**
 * Middleware factory: validates a specific part of the request with a Zod schema.
 * On success, the parsed data replaces the original (coercions applied).
 * On failure, passes a ZodError to the error handler.
 */
export function validate(schema: ZodSchema, part: RequestPart = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return next(result.error);
    }
    // Replace with parsed+coerced data
    (req as unknown as Record<string, unknown>)[part] = result.data;
    next();
  };
}

/**
 * Validates that a route :id param is a valid CUID.
 * Prevents passing arbitrary strings to DB queries.
 */
export function validateId(req: Request, _res: Response, next: NextFunction): void {
  const id = req.params["id"];
  if (!id || !/^c[a-z0-9]{24}$/i.test(id)) {
    return next(Errors.badRequest("Invalid ID format", "id"));
  }
  next();
}
