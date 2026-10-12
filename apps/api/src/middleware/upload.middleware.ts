import multer, { FileFilterCallback } from 'multer';
import type { Request, Response, NextFunction } from 'express';

// ─── ALLOWED FILE TYPES ───────────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

const ALLOWED_PDF_TYPES = [
  'application/pdf'
];

// ─── FILE SIZE LIMITS ────────────────────────────────────────────────────────
const SIZE_LIMITS = {
  image: 5 * 1024 * 1024,   // 5 MB — for CNIC photos and farm photos
  pdf: 20 * 1024 * 1024,    // 20 MB — for lab certificates
  any: 20 * 1024 * 1024     // 20 MB — general limit
};

// ─── MULTER STORAGE (MEMORY) ─────────────────────────────────────────────────
// Store in memory — files go from RAM directly to S3
const memoryStorage = multer.memoryStorage();

// ─── FILE FILTER FACTORIES ───────────────────────────────────────────────────
function createFileFilter(allowedTypes: string[]) {
  return (
    _req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback
  ): void => {
    if (allowedTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`
        )
      );
    }
  };
}

// ─── MULTER INSTANCES ────────────────────────────────────────────────────────
/**
 * For CNIC photos — single image, max 5MB
 * Usage: upload.cnicPhoto.single('photo')
 */
export const uploadCnicPhoto = multer({
  storage: memoryStorage,
  limits: { fileSize: SIZE_LIMITS.image, files: 1 },
  fileFilter: createFileFilter(ALLOWED_IMAGE_TYPES)
});

/**
 * For farm photos — up to 5 images, max 5MB each
 * Usage: upload.farmPhotos.array('photos', 5)
 */
export const uploadFarmPhotos = multer({
  storage: memoryStorage,
  limits: { fileSize: SIZE_LIMITS.image, files: 5 },
  fileFilter: createFileFilter(ALLOWED_IMAGE_TYPES)
});

/**
 * For lot intake photos — up to 5 images
 * Usage: upload.lotPhotos.array('photos', 5)
 */
export const uploadLotPhotos = multer({
  storage: memoryStorage,
  limits: { fileSize: SIZE_LIMITS.image, files: 5 },
  fileFilter: createFileFilter(ALLOWED_IMAGE_TYPES)
});

/**
 * For lab test certificates — single PDF, max 20MB
 * Usage: upload.labCertificate.single('certificate')
 */
export const uploadLabCertificate = multer({
  storage: memoryStorage,
  limits: { fileSize: SIZE_LIMITS.pdf, files: 1 },
  fileFilter: createFileFilter(ALLOWED_PDF_TYPES)
});

// ─── MULTER ERROR HANDLER ────────────────────────────────────────────────────
/**
 * Express error handler specifically for Multer errors.
 * Use AFTER the multer middleware in your route chain.
 *
 * Usage in routes:
 * router.post('/upload', uploadCnicPhoto.single('photo'), handleUploadError, controller)
 */
export function handleUploadError(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File exceeds the maximum allowed size',
          field: err.field
        }
      });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Too many files uploaded at once',
          field: err.field
        }
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message
      }
    });
    return;
  }

  if (err && err.message.includes('Invalid file type')) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: err.message
      }
    });
    return;
  }

  next(err);
}
