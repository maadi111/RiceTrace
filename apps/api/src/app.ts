/**
 * @file apps/api/src/app.ts
 * @description Express application setup for RiceTrace API.
 * Configures security, CORS, body parsers, logging, routes, error handlers,
 * and initializes BullMQ background workers.
 */

import "dotenv/config"; // Must be first — loads .env before env.ts
import { env } from "./config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import fs from "fs";

import { apiRouter } from "./routes/index.js";
import uploadRoutes from "./routes/upload.routes.js";
import certificateRoutes from "./routes/certificate.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { globalRateLimiter } from "./middleware/rate-limit.middleware.js";

// Import workers so they start listening for BullMQ background jobs
import "./workers/eudr.worker.js";
import "./workers/compliance.worker.js";
import "./workers/certificate.worker.js";
import { eudrWorker } from "./workers/eudr.worker.js";
import { complianceWorker } from "./workers/compliance.worker.js";
import { certificateWorker } from "./workers/certificate.worker.js";

const app = express();

// ─── SECURITY HEADERS ────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // Allow Leaflet tile requests in browser
  })
);

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── BODY PARSING ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ─── LOGGING ─────────────────────────────────────────────────────────────────
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// ─── RATE LIMITING ───────────────────────────────────────────────────────────
app.use(globalRateLimiter);

// ─── SERVE UPLOADS IN LOCAL DEV ──────────────────────────────────────────────
if (env.STORAGE_DRIVER === "local") {
  const uploadDir = path.resolve(env.LOCAL_UPLOAD_DIR);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadDir));
}

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ─── API ROUTES ──────────────────────────────────────────────────────────────
app.use("/api/v1", certificateRoutes);
app.use("/api/v1", apiRouter);
app.use("/api/v1", uploadRoutes);

// ─── 404 & ERROR HANDLING ────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown for workers
process.on("SIGTERM", async () => {
  console.log("Shutting down workers...");
  try {
    await eudrWorker.close();
    await complianceWorker.close();
    await certificateWorker.close();
  } catch (err) {
    console.error("Error during worker shutdown:", err);
  }
  process.exit(0);
});

export { app, eudrWorker, complianceWorker, certificateWorker };

