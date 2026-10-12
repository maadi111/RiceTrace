/**
 * @file packages/db/src/index.ts
 * @description Prisma client singleton for RiceTrace.
 * Exports a single PrismaClient instance — reused across the application
 * to avoid connection pool exhaustion, especially in serverless environments.
 */

import { PrismaClient } from "@prisma/client";

declare global {
  // Allow global `var` declaration for singleton pattern
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const url = (process.env["DATABASE_URL"] || "postgresql://postgres:postgres@127.0.0.1:5432/ricetrace?schema=public").replace("localhost:5432", "127.0.0.1:5432");
  return new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

// In development, use a global singleton to survive hot module reloads.
// In production, always create a new instance.
export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__prisma = prisma;
}

export * from "@prisma/client";
