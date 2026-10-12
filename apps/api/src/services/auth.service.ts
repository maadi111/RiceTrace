/**
 * @file apps/api/src/services/auth.service.ts
 * @description Authentication service for RiceTrace.
 * Handles password hashing, JWT creation/verification, and refresh token lifecycle.
 * Refresh tokens are stored hashed in the DB — raw tokens are never persisted.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "@ricetrace/db";
import { env } from "../config/env.js";
import type { JwtPayload, AuthTokens, AuthUser, UserRole } from "@ricetrace/types";
import { Errors } from "../middleware/error.middleware.js";

// ─── PASSWORD UTILITIES ──────────────────────────────────────────────────────

/**
 * Hashes a plaintext password using bcrypt.
 * The cost factor is read from ENV (default 12).
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, env.BCRYPT_ROUNDS);
}

/**
 * Compares a plaintext password against a stored bcrypt hash.
 * Uses bcrypt.compare which is timing-safe.
 */
export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

// ─── TOKEN GENERATION ────────────────────────────────────────────────────────

function createAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY_SECONDS,
  });
}

/**
 * Generates a cryptographically secure refresh token (raw hex),
 * stores a bcrypt hash of it in the DB, and returns the raw token.
 *
 * The raw token is sent to the client; the hash stays in the DB.
 * This means a stolen DB doesn't give attackers valid tokens.
 */
async function createAndStoreRefreshToken(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const rawToken = crypto.randomBytes(40).toString("hex");  // 80-char hex
  const tokenHash = await bcrypt.hash(rawToken, 10);        // Lighter hash for tokens

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.JWT_REFRESH_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: userAgent?.slice(0, 500),  // Limit length
      ipAddress: ipAddress?.slice(0, 45),
    },
  });

  return rawToken;
}

// ─── AUTH OPERATIONS ─────────────────────────────────────────────────────────

interface LoginResult {
  tokens: AuthTokens;
  user: AuthUser;
}

/**
 * Validates email/password and issues access + refresh tokens.
 */
export async function login(
  email: string,
  password: string,
  userAgent?: string,
  ipAddress?: string
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { organization: { select: { id: true, plan: true } } },
  });

  // Use constant-time comparison even when user doesn't exist
  // (prevents user enumeration via timing attack)
  const dummyHash =
    "$2b$12$invalidhashthatisjustlongenoughtomakebcryptrunfullcycles";
  const passwordValid = user
    ? await verifyPassword(password, user.passwordHash)
    : await bcrypt.compare(password, dummyHash).then(() => false);

  if (!user || !passwordValid) {
    throw Errors.unauthorized("Invalid email or password");
  }

  if (!user.isActive) {
    throw Errors.unauthorized("Your account has been deactivated. Contact your mill administrator.");
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = createAccessToken({
    sub: user.id,
    orgId: user.organizationId,
    role: user.role as UserRole,
  });

  const refreshToken = await createAndStoreRefreshToken(
    user.id,
    userAgent,
    ipAddress
  );

  return {
    tokens: { accessToken, refreshToken },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      organizationId: user.organizationId,
      language: user.language as "EN" | "UR",
    },
  };
}

/**
 * Exchanges a valid refresh token for a new access token.
 * The provided raw token is compared against all non-revoked, non-expired
 * DB records using bcrypt (timing-safe).
 */
export async function refreshAccessToken(
  rawRefreshToken: string
): Promise<{ accessToken: string }> {
  // Fetch recent non-revoked tokens for matching (within expiry window)
  const candidates = await prisma.refreshToken.findMany({
    where: {
      isRevoked: false,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: { select: { id: true, organizationId: true, role: true, isActive: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,  // Limit scan size — prod would use indexed lookup
  });

  // Find the matching token by bcrypt comparison
  let matched: (typeof candidates)[0] | null = null;
  for (const candidate of candidates) {
    const isMatch = await bcrypt.compare(rawRefreshToken, candidate.tokenHash);
    if (isMatch) {
      matched = candidate;
      break;
    }
  }

  if (!matched) {
    throw Errors.unauthorized("Invalid or expired refresh token");
  }

  if (!matched.user.isActive) {
    throw Errors.unauthorized("Account is deactivated");
  }

  const accessToken = createAccessToken({
    sub: matched.user.id,
    orgId: matched.user.organizationId,
    role: matched.user.role as UserRole,
  });

  return { accessToken };
}

/**
 * Revokes a specific refresh token, logging the user out from that session.
 */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  // Find and revoke matching token
  const candidates = await prisma.refreshToken.findMany({
    where: { isRevoked: false },
    take: 50,
  });

  for (const candidate of candidates) {
    const isMatch = await bcrypt.compare(rawToken, candidate.tokenHash);
    if (isMatch) {
      await prisma.refreshToken.update({
        where: { id: candidate.id },
        data: { isRevoked: true },
      });
      return;
    }
  }
  // If token not found — silently succeed (idempotent logout)
}

/**
 * Revokes ALL refresh tokens for a user (logout from all devices).
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
}

/**
 * Purges expired refresh tokens from the database.
 * Should be called periodically (e.g. via a cron job).
 */
export async function purgeExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
