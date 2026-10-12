import type { Request, Response } from 'express';
import { prisma } from '@ricetrace/db';
import {
  uploadFile,
  generateStorageKey,
  deleteFile,
  extractKeyFromUrl,
  getSignedDownloadUrl
} from '../lib/storage.js';

// ─── FARMER CNIC PHOTOS ──────────────────────────────────────────────────────
/**
 * POST /farmers/:id/cnic-photo
 * Body: multipart/form-data with field 'photo' (image)
 * Query param: side = 'front' | 'back' (default: 'front')
 */
export async function uploadFarmerCnicPhoto(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
      return;
    }

    const { id } = req.params;
    const side = (req.query.side as string) === 'back' ? 'back' : 'front';

    // Verify farmer exists and belongs to org
    const farmer = await prisma.farmer.findFirst({
      where: { id, organizationId: req.user.organizationId }
    });

    if (!farmer) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Farmer not found' }
      });
      return;
    }

    // File must be present (Multer puts it on req.file)
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No photo file provided' }
      });
      return;
    }

    // Delete old photo from S3 if one exists
    const existingUrl = side === 'front' ? farmer.cnicFrontPhotoUrl : farmer.cnicBackPhotoUrl;
    if (existingUrl) {
      const oldKey = extractKeyFromUrl(existingUrl);
      if (oldKey) await deleteFile(oldKey);
    }

    // Upload new photo
    const key = generateStorageKey(
      `farmers/cnic/${side}`,
      req.user.organizationId,
      req.file.originalname
    );

    const uploadResult = await uploadFile({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      key,
      size: req.file.size,
      isPublic: false // CNIC photos are private — require signed URLs
    });

    // Update farmer record
    const fieldName = side === 'front' ? 'cnicFrontPhotoUrl' : 'cnicBackPhotoUrl';
    await prisma.farmer.update({
      where: { id },
      data: { [fieldName]: uploadResult.url }
    });

    res.status(200).json({
      success: true,
      data: {
        farmerId: id,
        side,
        url: uploadResult.url,
        size: uploadResult.size
      }
    });
  } catch (error) {
    console.error('[Upload] CNIC photo error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to upload photo' }
    });
  }
}

// ─── FARM PHOTOS ─────────────────────────────────────────────────────────────
/**
 * POST /farms/:id/photos
 * Body: multipart/form-data with field 'photos' (1-5 images)
 * Appends new photos to existing photoUrls array — does not replace
 */
export async function uploadFarmPhotos(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
      return;
    }

    const { id } = req.params;

    // Verify farm exists and belongs to org
    const farm = await prisma.farm.findFirst({
      where: { id, farmer: { organizationId: req.user.organizationId } }
    });

    if (!farm) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Farm not found' }
      });
      return;
    }

    // Files must be present (Multer puts them on req.files)
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No photo files provided' }
      });
      return;
    }

    // Check total photo count — max 10 photos per farm
    const currentCount = farm.photoUrls?.length || 0;
    if (currentCount + files.length > 10) {
      res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_PHOTOS',
          message: `Farm already has ${currentCount} photos. Maximum is 10 total.`
        }
      });
      return;
    }

    // Upload all files in parallel
    const uploadPromises = files.map(file => {
      const key = generateStorageKey(
        'farms/photos',
        req.user!.organizationId,
        file.originalname
      );
      return uploadFile({
        buffer: file.buffer,
        mimeType: file.mimetype,
        key,
        size: file.size,
        isPublic: false
      });
    });

    const uploadResults = await Promise.all(uploadPromises);
    const newUrls = uploadResults.map(r => r.url);

    // Append to existing photoUrls array
    const updatedFarm = await prisma.farm.update({
      where: { id },
      data: {
        photoUrls: { push: newUrls }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        farmId: id,
        addedCount: newUrls.length,
        newUrls,
        totalPhotos: updatedFarm.photoUrls.length
      }
    });
  } catch (error) {
    console.error('[Upload] Farm photos error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to upload farm photos' }
    });
  }
}

/**
 * DELETE /farms/:id/photos
 * Body: { url: string } — the specific photo URL to remove
 */
export async function deleteFarmPhoto(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
      return;
    }

    const { id } = req.params;
    const { url } = req.body as { url?: string };

    if (!url) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELD',
          message: 'url is required',
          field: 'url'
        }
      });
      return;
    }

    // Verify farm belongs to org
    const farm = await prisma.farm.findFirst({
      where: { id, farmer: { organizationId: req.user.organizationId } }
    });

    if (!farm) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Farm not found' }
      });
      return;
    }

    if (!farm.photoUrls?.includes(url)) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Photo URL not found on this farm' }
      });
      return;
    }

    // Delete from S3
    const key = extractKeyFromUrl(url);
    if (key) await deleteFile(key);

    // Remove from DB array
    const updatedFarm = await prisma.farm.update({
      where: { id },
      data: {
        photoUrls: farm.photoUrls.filter(u => u !== url)
      }
    });

    res.status(200).json({
      success: true,
      data: {
        farmId: id,
        removedUrl: url,
        totalPhotos: updatedFarm.photoUrls.length
      }
    });
  } catch (error) {
    console.error('[Upload] Delete farm photo error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete farm photo' }
    });
  }
}

// ─── LAB TEST CERTIFICATE ────────────────────────────────────────────────────
/**
 * POST /lab-tests/:id/certificate
 * Body: multipart/form-data with field 'certificate' (PDF only)
 * Replaces existing certificate if one already exists
 */
export async function uploadLabCertificate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
      return;
    }

    const { id } = req.params;

    // Verify lab test exists and belongs to org
    const labTest = await prisma.labTest.findFirst({
      where: { id, organizationId: req.user.organizationId }
    });

    if (!labTest) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Lab test not found' }
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No certificate PDF provided' }
      });
      return;
    }

    // Delete old certificate if one exists
    if (labTest.certificateUrl) {
      const oldKey = extractKeyFromUrl(labTest.certificateUrl);
      if (oldKey) await deleteFile(oldKey);
    }

    // Upload new certificate
    const key = generateStorageKey(
      'lab-tests/certificates',
      req.user.organizationId,
      req.file.originalname
    );

    const uploadResult = await uploadFile({
      buffer: req.file.buffer,
      mimeType: 'application/pdf',
      key,
      size: req.file.size,
      isPublic: false // Lab certificates are private
    });

    // Update lab test record
    const updatedLabTest = await prisma.labTest.update({
      where: { id },
      data: {
        certificateUrl: uploadResult.url,
        certificateFileName: req.file.originalname,
        certificateUploadedAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      data: {
        labTestId: id,
        certificateUrl: uploadResult.url,
        fileName: req.file.originalname,
        size: uploadResult.size,
        uploadedAt: updatedLabTest.certificateUploadedAt
      }
    });
  } catch (error) {
    console.error('[Upload] Lab certificate error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to upload certificate' }
    });
  }
}

/**
 * DELETE /lab-tests/:id/certificate
 * Removes the certificate from S3 and clears the DB fields
 */
export async function deleteLabCertificate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
      return;
    }

    const { id } = req.params;
    const labTest = await prisma.labTest.findFirst({
      where: { id, organizationId: req.user.organizationId }
    });

    if (!labTest) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Lab test not found' }
      });
      return;
    }

    if (!labTest.certificateUrl) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No certificate exists for this lab test' }
      });
      return;
    }

    // Delete from S3
    const key = extractKeyFromUrl(labTest.certificateUrl);
    if (key) await deleteFile(key);

    // Clear DB fields
    await prisma.labTest.update({
      where: { id },
      data: {
        certificateUrl: null,
        certificateFileName: null,
        certificateUploadedAt: null
      }
    });

    res.status(200).json({
      success: true,
      data: {
        labTestId: id,
        message: 'Certificate deleted successfully'
      }
    });
  } catch (error) {
    console.error('[Upload] Delete certificate error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete certificate' }
    });
  }
}

// ─── SIGNED URL ENDPOINT ─────────────────────────────────────────────────────
/**
 * GET /files/signed-url
 * Query: key (the S3 key stored in DB) OR url (full URL stored in DB)
 * Returns a 1-hour signed URL for private file access
 * Use this whenever the frontend needs to display or download a private file
 */
export async function getFileSignedUrl(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
      return;
    }

    let key = req.query.key as string | undefined;
    const url = req.query.url as string | undefined;

    if (!key && !url) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAM', message: 'Provide either key or url query parameter' }
      });
      return;
    }

    // If a full URL was passed, extract the key from it
    if (!key && url) {
      const extracted = extractKeyFromUrl(url);
      if (!extracted) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_URL', message: 'Could not parse the provided URL' }
        });
        return;
      }
      key = extracted;
    }

    // Verify the key belongs to this organization
    // Key format contains organizationId as one of the path segments
    const keyParts = key!.split('/');
    const isOwner = keyParts.includes(req.user.organizationId);

    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this file' }
      });
      return;
    }

    const signedUrl = await getSignedDownloadUrl(key!, 3600);

    res.status(200).json({
      success: true,
      data: {
        signedUrl,
        expiresInSeconds: 3600,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('[Upload] Signed URL error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate signed URL' }
    });
  }
}
