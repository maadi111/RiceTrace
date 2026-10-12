/**
 * @file apps/api/src/services/storage.service.ts
 * @description File storage service supporting local disk (development) and
 * AWS S3-compatible storage (production). All file operations go through this
 * abstraction layer so switching storage backends requires no changes to routes.
 */

import { env } from "../config/env.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { UploadedFile } from "@ricetrace/types";

// Allowed MIME types and their extensions — validated server-side
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "text/html": ".html",
};

/**
 * Validates the MIME type of an uploaded file.
 * Rejects anything not on the allowlist (prevents malicious uploads).
 */
export function validateMimeType(mimeType: string): void {
  if (!ALLOWED_MIME_TYPES[mimeType]) {
    throw new Error(
      `File type '${mimeType}' is not allowed. Accepted: JPEG, PNG, WebP, PDF`
    );
  }
}

/**
 * Generates a secure, collision-resistant storage key for an uploaded file.
 * Format: {prefix}/{orgId}/{uuid}{ext}
 */
function generateStorageKey(
  prefix: string,
  orgId: string,
  mimeType: string
): string {
  const ext = ALLOWED_MIME_TYPES[mimeType] ?? "";
  const uuid = crypto.randomUUID();
  return `${prefix}/${orgId}/${uuid}${ext}`;
}

// ─── LOCAL STORAGE (development only) ───────────────────────────────────────

async function saveLocalFile(
  buffer: Buffer,
  key: string
): Promise<string> {
  const uploadDir = path.resolve(env.LOCAL_UPLOAD_DIR);
  const filePath = path.join(uploadDir, key.replace(/\//g, path.sep));
  const dir = path.dirname(filePath);

  // Prevent path traversal
  const resolvedPath = path.resolve(filePath);
  const resolvedUploadDir = path.resolve(uploadDir);
  if (!resolvedPath.startsWith(resolvedUploadDir)) {
    throw new Error("Invalid file path");
  }

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, buffer);

  // Return a URL the Express static server can serve
  return `${env.API_URL}/uploads/${key}`;
}

// ─── S3 STORAGE (production) ─────────────────────────────────────────────────

async function saveS3File(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<string> {
  // Dynamic import to avoid loading AWS SDK in local dev
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  if (
    !env.S3_BUCKET_NAME ||
    !env.S3_REGION ||
    !env.S3_ACCESS_KEY_ID ||
    !env.S3_SECRET_ACCESS_KEY
  ) {
    throw new Error("S3 environment variables are not configured");
  }

  const client = new S3Client({
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    ...(env.S3_ENDPOINT_URL && { endpoint: env.S3_ENDPOINT_URL }),
  });

  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      // No public-read ACL — generate signed URLs when serving files
    })
  );

  // Return the key — callers generate signed URLs when needed
  return key;
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

interface SaveFileOptions {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  prefix: string;      // e.g. "cnic-photos", "lab-certs", "farm-photos"
  orgId: string;
}

/**
 * Saves a file to the configured storage backend.
 * Returns an UploadedFile descriptor with the URL or key.
 */
export async function saveFile(options: SaveFileOptions): Promise<UploadedFile> {
  const { buffer, originalName, mimeType, prefix, orgId } = options;

  validateMimeType(mimeType);

  const key = generateStorageKey(prefix, orgId, mimeType);

  let url: string;
  if (env.STORAGE_DRIVER === "s3") {
    url = await saveS3File(buffer, key, mimeType);
  } else {
    url = await saveLocalFile(buffer, key);
  }

  return {
    url,
    key,
    mimeType,
    sizeBytes: buffer.length,
    originalName,
  };
}

/**
 * Deletes a file from storage by its key.
 * In local dev, removes the file from disk.
 * In production (S3), sends a delete request.
 */
export async function deleteFile(key: string): Promise<void> {
  if (env.STORAGE_DRIVER === "local") {
    const filePath = path.join(
      path.resolve(env.LOCAL_UPLOAD_DIR),
      key.replace(/\//g, path.sep)
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } else {
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    if (!env.S3_BUCKET_NAME || !env.S3_REGION) return;

    const client = new S3Client({ region: env.S3_REGION });
    await client.send(
      new DeleteObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key })
    );
  }
}

export const storageService = {
  upload: async (buffer: Buffer, key: string, mimeType: string, originalName: string) => {
    return saveFile({
      buffer,
      originalName,
      mimeType,
      prefix: "certificates",
      orgId: "exports",
    });
  },
  saveFile,
  deleteFile,
};
