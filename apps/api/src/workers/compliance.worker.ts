/**
 * @file apps/api/src/workers/compliance.worker.ts
 * @description BullMQ worker for asynchronous shipment compliance calculations.
 * Processes background recalculation jobs from the 'compliance-scores' queue.
 */

import { Worker } from "bullmq";
import { connection } from "../lib/queue.js";
import { calculateComplianceScore } from "../services/compliance-score.service.js";

interface ComplianceJobData {
  shipmentId: string;
  organizationId: string;
}

export const complianceWorker = new Worker<ComplianceJobData>(
  "compliance-scores",
  async (job) => {
    const { shipmentId, organizationId } = job.data;
    console.log(`[Compliance Worker] Processing shipment ${shipmentId}`);
    await calculateComplianceScore(shipmentId, organizationId);
    console.log(`[Compliance Worker] Completed shipment ${shipmentId}`);
  },
  { connection, concurrency: 5 }
);

complianceWorker.on("failed", (job, err) => {
  console.error(`[Compliance Worker] Job ${job?.id} failed:`, err.message);
});
