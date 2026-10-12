import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// Initialize S3 client — works for both AWS and Cloudflare R2
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || 'mock',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'mock'
  },
  // Only set endpoint for Cloudflare R2 or other S3-compatible providers
  ...(process.env.S3_ENDPOINT_URL ? { endpoint: process.env.S3_ENDPOINT_URL } : {})
});

const BUCKET = process.env.S3_BUCKET_NAME;

// ─── KEY GENERATION ───────────────────────────────────────────────────────────

/**
 * Generates a safe, unique S3 key for a file upload.
 * Format: {folder}/{organizationId}/{timestamp}-{randomHex}.{ext}
 * Example: farmers/cnic/org_abc/1699876543-a3f9c2d1.jpg
 */
export function generateStorageKey(
  folder: string,
  organizationId: string,
  originalFilename: string
): string {
  const ext = path.extname(originalFilename).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(4).toString('hex');
  const safeExt = ext || '.bin';
  return `${folder}/${organizationId}/${timestamp}-${randomHex}${safeExt}`;
}

// ─── UPLOAD ───────────────────────────────────────────────────────────────────

export interface UploadResult {
  key: string;       // S3 object key — store this in DB
  url: string;       // Full URL to access the file
  size: number;
  mimeType: string;
}

export async function uploadFile(params: {
  buffer: Buffer;
  mimeType: string;
  key: string;
  size: number;
  isPublic?: boolean;
}): Promise<UploadResult> {
  const { buffer, mimeType, key, size, isPublic = false } = params;

  // Local storage fallback for development
  if (process.env.STORAGE_DRIVER === 'local' || !BUCKET) {
    const uploadDir = path.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads');
    const filePath = path.join(uploadDir, key.replace(/\//g, path.sep));
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, buffer);
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    return { key, url: `${apiUrl}/uploads/${key}`, size, mimeType };
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      // ACL only supported on AWS S3 — Cloudflare R2 ignores this
      ...(isPublic ? { ACL: 'public-read' } : {})
    })
  );

  // Build the URL
  let url: string;
  if (process.env.S3_PUBLIC_URL) {
    url = `${process.env.S3_PUBLIC_URL}/${key}`;
  } else if (process.env.S3_ENDPOINT_URL) {
    // Cloudflare R2 style URL
    url = `${process.env.S3_ENDPOINT_URL}/${BUCKET}/${key}`;
  } else {
    // Standard AWS S3 URL
    url = `https://${BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
  }

  return { key, url, size, mimeType };
}

// ─── SIGNED URLS (PRIVATE FILES) ─────────────────────────────────────────────

/**
 * Generates a time-limited signed URL for private file access.
 * Use this when serving lab certificates or CNIC photos to authenticated users.
 * Default expiry: 1 hour
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  if (process.env.STORAGE_DRIVER === 'local' || !BUCKET) {
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    return `${apiUrl}/uploads/${key}`;
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * Deletes a file from S3 by its key.
 * Does NOT throw if the file doesn't exist — safe to call defensively.
 */
export async function deleteFile(key: string): Promise<void> {
  if (process.env.STORAGE_DRIVER === 'local' || !BUCKET) {
    const uploadDir = path.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads');
    const filePath = path.join(uploadDir, key.replace(/\//g, path.sep));
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
    }
    return;
  }

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key
      })
    );
  } catch (error) {
    // Log but don't throw — a missing file should not block record deletion
    console.warn(`[Storage] Could not delete key ${key}:`, error);
  }
}

/**
 * Deletes multiple files in parallel.
 * Safe — never throws even if some deletions fail.
 */
export async function deleteFiles(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await Promise.allSettled(keys.map(key => deleteFile(key)));
}

// ─── KEY EXTRACTION ───────────────────────────────────────────────────────────

/**
 * Extracts the S3 key from a full URL.
 * Use when you have stored the URL in DB but need the key to delete.
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Remove leading slash from pathname
    return urlObj.pathname.replace(/^\//, '');
  } catch {
    return null;
  }
}
