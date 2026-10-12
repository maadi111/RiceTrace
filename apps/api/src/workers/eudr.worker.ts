/**
 * @file apps/api/src/workers/eudr.worker.ts
 * @description BullMQ worker for asynchronous EUDR deforestation risk checks.
 * Processes jobs from the 'eudr-checks' queue with rate limiting to respect GFW API limits.
 */

import { Worker } from "bullmq";
import { connection } from "../lib/queue.js";
import { triggerEudrCheckForFarm } from "../services/eudr-check.service.js";

interface EudrJobData {
  farmId: string;
}

export const eudrWorker = new Worker<EudrJobData>(
  "eudr-checks",
  async (job) => {
    const { farmId } = job.data;
    console.log(`[EUDR Worker] Processing farm ${farmId}`);
    await triggerEudrCheckForFarm(farmId);
    console.log(`[EUDR Worker] Completed farm ${farmId}`);
  },
  {
    connection,
    concurrency: 3, // Max 3 simultaneous GFW API calls
    limiter: {
      max: 10, // Max 10 jobs per duration
      duration: 60000, // Per 60 seconds — respects GFW rate limits
    },
  }
);

eudrWorker.on("failed", (job, err) => {
  console.error(`[EUDR Worker] Job ${job?.id} failed:`, err.message);
});
