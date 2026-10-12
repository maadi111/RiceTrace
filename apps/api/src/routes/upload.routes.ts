import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  uploadCnicPhoto,
  uploadFarmPhotos,
  uploadLabCertificate,
  handleUploadError
} from '../middleware/upload.middleware.js';
import {
  uploadFarmerCnicPhoto,
  uploadFarmPhotos as uploadFarmPhotosHandler,
  deleteFarmPhoto,
  uploadLabCertificate as uploadLabCertHandler,
  deleteLabCertificate,
  getFileSignedUrl
} from '../controllers/upload.controller.js';

const router = Router();

// All upload routes require authentication
router.use(authenticate);

// ─── FARMER CNIC PHOTOS ──────────────────────────────────────────────────────
// Who can upload: PROCUREMENT_OFFICER, MILL_ADMIN
router.post(
  '/farmers/:id/cnic-photo',
  requireRole(['MILL_ADMIN', 'PROCUREMENT_OFFICER']),
  uploadCnicPhoto.single('photo'),
  handleUploadError,
  uploadFarmerCnicPhoto
);

// ─── FARM PHOTOS ─────────────────────────────────────────────────────────────
// Who can upload: PROCUREMENT_OFFICER, MILL_ADMIN
router.post(
  '/farms/:id/photos',
  requireRole(['MILL_ADMIN', 'PROCUREMENT_OFFICER']),
  uploadFarmPhotos.array('photos', 5),
  handleUploadError,
  uploadFarmPhotosHandler
);

router.delete(
  '/farms/:id/photos',
  requireRole(['MILL_ADMIN', 'PROCUREMENT_OFFICER']),
  deleteFarmPhoto
);

// ─── LAB CERTIFICATE ─────────────────────────────────────────────────────────
// Who can upload: QUALITY_MANAGER, MILL_ADMIN
router.post(
  '/lab-tests/:id/certificate',
  requireRole(['MILL_ADMIN', 'QUALITY_MANAGER']),
  uploadLabCertificate.single('certificate'),
  handleUploadError,
  uploadLabCertHandler
);

router.delete(
  '/lab-tests/:id/certificate',
  requireRole(['MILL_ADMIN', 'QUALITY_MANAGER']),
  deleteLabCertificate
);

// ─── SIGNED URL (PRIVATE FILE ACCESS) ────────────────────────────────────────
// Any authenticated user can request a signed URL
// The controller verifies org ownership of the file
router.get('/files/signed-url', getFileSignedUrl);

export default router;
