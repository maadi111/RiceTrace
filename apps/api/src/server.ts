/**
 * @file apps/api/src/server.ts
 * @description Entry point for the RiceTrace Express API server.
 * Imports configured application from app.ts, starts HTTP listener,
 * and handles graceful shutdown for HTTP server and BullMQ background workers.
 */

import "dotenv/config"; // Must be first — loads .env before env.ts
import { createServer } from "http";
import { env } from "./config/env.js";
import { app, eudrWorker, complianceWorker } from "./app.js";

const server = createServer(app);

server.listen(env.PORT, () => {
  console.log(
    `🚀 RiceTrace API running on http://localhost:${env.PORT} [${env.NODE_ENV}]`
  );
});

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`${signal} received — shutting down gracefully...`);
  server.close(async () => {
    console.log("HTTP server closed.");
    try {
      console.log("Shutting down workers...");
      await Promise.allSettled([eudrWorker.close(), complianceWorker.close()]);
      console.log("Workers closed.");
    } catch (err) {
      console.error("Error closing workers:", err);
    }
    process.exit(0);
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export { app, server };
