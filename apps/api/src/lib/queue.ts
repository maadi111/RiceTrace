/**
 * @file apps/api/src/lib/queue.ts
 * @description BullMQ queue definitions and shared IORedis connection.
 */

import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null, // Required by BullMQ
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
});

connection.on("error", (err: Error) => {
  console.warn("[Redis] Connection error:", err.message);
});

// Queue definitions
export const eudrQueue = new Queue("eudr-checks", { connection });
export const complianceQueue = new Queue("compliance-scores", { connection });
export const certificateQueue = new Queue("certificates", { connection });

export { connection };

