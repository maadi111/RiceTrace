/**
 * @file packages/types/src/index.ts
 * @description Shared TypeScript types for RiceTrace — used by both the API
 * server and Next.js frontend. Keep this framework-agnostic.
 */

// ─── API RESPONSE ENVELOPE ───────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    field?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

// ─── AUTH TYPES ──────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;          // userId
  orgId: string;        // organizationId
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  language: Language;
}

// ─── ENUMS (mirrored from Prisma — keep in sync) ─────────────────────────────

export type Plan = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export type UserRole =
  | "MILL_ADMIN"
  | "PROCUREMENT_OFFICER"
  | "MILL_MANAGER"
  | "QUALITY_MANAGER"
  | "EXPORT_MANAGER";

export type Language = "EN" | "UR";

export type EudrRisk = "PENDING" | "LOW" | "MEDIUM" | "HIGH";

export type LotStatus =
  | "RECEIVED"
  | "IN_MILLING"
  | "MILLED"
  | "PARTIALLY_MILLED";

export type RiceVariety =
  | "BASMATI_1121"
  | "BASMATI_386"
  | "BASMATI_SUPER"
  | "PARBOILED"
  | "IRRI_6"
  | "IRRI_9"
  | "OTHER";

export type BatchStatus = "IN_PROGRESS" | "COMPLETED" | "QUALITY_HOLD";

export type LabTestType =
  | "PESTICIDE_RESIDUE"
  | "HEAVY_METALS"
  | "MOISTURE"
  | "PHYSICAL_INSPECTION"
  | "MYCOTOXIN"
  | "FULL_PANEL";

export type LabResult = "PENDING" | "PASS" | "FAIL" | "CONDITIONAL";

export type ComplianceStatus = "INCOMPLETE" | "AT_RISK" | "COMPLIANT";

export type ShipmentStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "CERTIFICATE_ISSUED"
  | "SHIPPED"
  | "DELIVERED";

// ─── COMPLIANCE ENGINE TYPES ──────────────────────────────────────────────────

export type ComplianceCategory = "EUDR" | "SPS" | "TRACEABILITY";

export interface CheckItem {
  id: string;
  category: ComplianceCategory;
  label: string;
  passed: boolean;
  points: number;
  detail?: string;  // Explains failure, e.g. "Farm #3 missing GPS"
}

export interface ComplianceCheckResult {
  score: number;    // 0–100
  status: ComplianceStatus;
  checks: CheckItem[];
}

// ─── STORAGE TYPES ───────────────────────────────────────────────────────────

export interface UploadedFile {
  url: string;
  key: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
}

// ─── EUDR ────────────────────────────────────────────────────────────────────

export interface EudrCheckResult {
  riskLevel: EudrRisk;
  checkedAt: Date;
  source: string;
  alertsFound: number;
}

// ─── BUYER PORTAL ────────────────────────────────────────────────────────────

export interface BuyerPortalInfo {
  organizationName: string;
  organizationLogoUrl?: string;
  buyerName: string;
  buyerCompany: string;
}
