import { Worker } from 'bullmq';
import { connection } from '../lib/queue.js';
import { generateCertificate } from '../services/pdf-generator.service.js';

export const certificateWorker = new Worker(
  'certificates',
  async (job) => {
    const { shipmentId, organizationId } = job.data as { shipmentId: string; organizationId: string };
    console.log(`[Cert Worker] Generating certificate for shipment ${shipmentId}`);
    const result = await generateCertificate(shipmentId, organizationId);
    console.log(`[Cert Worker] Done — ${result.certNumber}`);
    return result;
  },
  {
    connection,
    concurrency: 2, // Puppeteer is heavy — limit parallel instances
    limiter: {
      max: 10,
      duration: 60000 // Max 10 PDFs per minute
    }
  }
);

certificateWorker.on('completed', (job, result) => {
  console.log(`[Cert Worker] Job ${job.id} completed — ${result?.certNumber}`);
});

certificateWorker.on('failed', (job, err) => {
  console.error(`[Cert Worker] Job ${job?.id} failed:`, err.message);
});
