import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  requestCertificateGeneration,
  getCertificateStatus,
  downloadCertificate
} from '../controllers/shipment.controller';
import { verifyCertificate } from '../controllers/verify.controller';

const router = Router();

// ─── AUTHENTICATED CERTIFICATE ROUTES ────────────────────────────────────────
router.post(
  '/shipments/:id/certificate',
  authenticate,
  requestCertificateGeneration
);

router.get(
  '/shipments/:id/certificate/status',
  authenticate,
  getCertificateStatus
);

router.get(
  '/shipments/:id/certificate/download',
  authenticate,
  downloadCertificate
);

// ─── PUBLIC VERIFICATION (no auth — QR code scan destination) ────────────────
router.get('/verify/:certNumber', verifyCertificate);

export default router;
