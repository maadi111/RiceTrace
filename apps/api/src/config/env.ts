/**
 * @file apps/api/src/config/env.ts
 * @description Validates and exports all environment variables at startup.
 * The app will fail fast with a clear error if any required variable is missing,
 * rather than crashing silently at runtime.
 */

import { z } from "zod";

const EnvSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // Redis (optional in dev — BullMQ and rate limiting degrade gracefully)
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL").optional(),

  // JWT
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRY_SECONDS: z.coerce.number().default(900),
  JWT_REFRESH_EXPIRY_DAYS: z.coerce.number().default(30),

  // Storage
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  LOCAL_UPLOAD_DIR: z.string().default("./uploads"),
  S3_BUCKET_NAME: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT_URL: z.string().url().optional(),

  // Email
  EMAIL_FROM: z.string().email().default("noreply@ricetrace.pk"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // App URLs
  APP_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://localhost:4000"),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(14).default(12),
});

function loadEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    for (const [field, errors] of Object.entries(
      result.error.flatten().fieldErrors
    )) {
      console.error(`  ${field}: ${errors?.join(", ")}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
export type Env = typeof env;
