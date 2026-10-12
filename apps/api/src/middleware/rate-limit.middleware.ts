/**
 * @file apps/api/src/middleware/rate-limit.middleware.ts
 * @description Rate limiting middleware for the RiceTrace API.
 * Uses express-rate-limit with in-memory store (upgradeable to Redis via
 * rate-limit-redis when Redis is available in production).
 */

import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

/** Global rate limiter — applied to all routes */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please wait before trying again.",
    },
  },
});

/** Stricter limiter for authentication endpoints */
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,  // Only count failed auth attempts
  message: {
    success: false,
    error: {
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      message:
        "Too many authentication attempts. Please wait 15 minutes and try again.",
    },
  },
});

/** Limiter for file upload endpoints */
export const uploadRateLimiter = rateLimit({
  windowMs: 60_000,  // 1 minute
  max: 20,
  message: {
    success: false,
    error: {
      code: "UPLOAD_RATE_LIMIT_EXCEEDED",
      message: "Too many upload requests. Please wait a moment.",
    },
  },
});

/** Buyer portal rate limiter (100 requests/day per token via Redis in prod) */
export const buyerPortalRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,  // 24 hours
  max: 100,
  keyGenerator: (req) =>
    (req.params["token"] as string | undefined) ?? req.ip ?? "unknown",
  message: {
    success: false,
    error: {
      code: "PORTAL_RATE_LIMIT_EXCEEDED",
      message: "Daily portal access limit reached.",
    },
  },
});
