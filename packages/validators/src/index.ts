/**
 * @file packages/validators/src/index.ts
 * @description Shared Zod validation schemas for RiceTrace.
 * Used by both the Express API (server-side) and Next.js forms (client-side).
 * All schemas are exported individually and as named groups.
 */

import { z } from "zod";

// ─── COMMON / REUSABLE ────────────────────────────────────────────────────────

export const IdSchema = z.string().cuid({ message: "Invalid ID format" });

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// CNIC: exactly 13 numeric digits (no dashes)
export const CnicSchema = z
  .string()
  .regex(/^\d{13}$/, "CNIC must be exactly 13 digits with no dashes");

// Pakistani phone number: +92 followed by 10 digits, or local 03xx format
export const PhoneSchema = z
  .string()
  .regex(
    /^(\+92|0)\d{10}$/,
    "Phone must be a valid Pakistani number (e.g. 03001234567)"
  )
  .optional();

export const CoordinateLatSchema = z.number().min(-90).max(90);
export const CoordinateLngSchema = z.number().min(-180).max(180);

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// ─── USERS / ORG ─────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum([
    "MILL_ADMIN",
    "PROCUREMENT_OFFICER",
    "MILL_MANAGER",
    "QUALITY_MANAGER",
    "EXPORT_MANAGER",
  ]),
  language: z.enum(["EN", "UR"]).default("EN"),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z
    .enum([
      "MILL_ADMIN",
      "PROCUREMENT_OFFICER",
      "MILL_MANAGER",
      "QUALITY_MANAGER",
      "EXPORT_MANAGER",
    ])
    .optional(),
  language: z.enum(["EN", "UR"]).optional(),
  isActive: z.boolean().optional(),
});

export const CreateMillSchema = z.object({
  name: z.string().min(2).max(200),
  licenseNumber: z.string().max(100).optional(),
  address: z.string().min(5).max(500),
  district: z.string().min(2).max(100),
  province: z.string().default("Punjab"),
  geoLat: CoordinateLatSchema.optional(),
  geoLng: CoordinateLngSchema.optional(),
});

export const UpdateMillSchema = CreateMillSchema.partial();

// ─── FARMERS ─────────────────────────────────────────────────────────────────

export const CreateFarmerSchema = z.object({
  cnic: CnicSchema,
  name: z.string().min(2).max(150),
  fatherName: z.string().max(150).optional(),
  phone: PhoneSchema,
  village: z.string().max(150).optional(),
  union: z.string().max(150).optional(),
  tehsil: z.string().max(150).optional(),
  district: z.string().min(2).max(100),
});

export const UpdateFarmerSchema = CreateFarmerSchema.partial().omit({
  cnic: true,
});

export const FarmerQuerySchema = PaginationSchema.extend({
  search: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  eudrRisk: z.enum(["PENDING", "LOW", "MEDIUM", "HIGH"]).optional(),
  isVerified: z.coerce.boolean().optional(),
});

// ─── FARMS ───────────────────────────────────────────────────────────────────

export const CreateFarmSchema = z.object({
  name: z.string().max(200).optional(),
  areaAcres: z.number().positive("Area must be a positive number"),
  geoLat: CoordinateLatSchema,
  geoLng: CoordinateLngSchema,
  geoPolygon: z.record(z.unknown()).optional(),  // GeoJSON — validated loosely
  district: z.string().min(2).max(100),
  tehsil: z.string().max(100).optional(),
  landTitle: z.string().max(100).optional(),    // Khasra / Fard number
});

export const UpdateFarmSchema = CreateFarmSchema.partial();

// ─── PROCUREMENT LOTS ────────────────────────────────────────────────────────

export const PesticideRecordSchema = z.object({
  name: z.string().min(1).max(200),
  activeIngredient: z.string().max(200).optional(),
  applicationDate: z.coerce.date().optional(),
  daysBeforeHarvest: z.number().int().min(0).max(365).optional(),
  doseLitersPerAcre: z.number().positive().optional(),
});

export const FertilizerRecordSchema = z.object({
  name: z.string().min(1).max(200),
  npkRatio: z.string().max(20).optional(),
  applicationDate: z.coerce.date().optional(),
});

export const CreateProcurementLotSchema = z.object({
  millId: IdSchema,
  farmerId: IdSchema,
  farmId: IdSchema,
  variety: z.enum([
    "BASMATI_1121",
    "BASMATI_386",
    "BASMATI_SUPER",
    "PARBOILED",
    "IRRI_6",
    "IRRI_9",
    "OTHER",
  ]),
  weightKg: z.number().positive("Weight must be positive"),
  moisturePercent: z.number().min(0).max(30).optional(),
  dateReceived: z.coerce.date(),
  vehicleNumber: z.string().max(50).optional(),
  noPesticidesFlag: z.boolean().default(false),
  pesticidesUsed: z.array(PesticideRecordSchema).default([]),
  fertilizersUsed: z.array(FertilizerRecordSchema).default([]),
  gpsLat: CoordinateLatSchema.optional(),
  gpsLng: CoordinateLngSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const UpdateProcurementLotSchema = CreateProcurementLotSchema.partial().omit({
  millId: true,
  farmerId: true,
  farmId: true,
});

export const LotQuerySchema = PaginationSchema.extend({
  millId: IdSchema.optional(),
  farmerId: IdSchema.optional(),
  variety: z
    .enum([
      "BASMATI_1121",
      "BASMATI_386",
      "BASMATI_SUPER",
      "PARBOILED",
      "IRRI_6",
      "IRRI_9",
      "OTHER",
    ])
    .optional(),
  status: z
    .enum(["RECEIVED", "IN_MILLING", "MILLED", "PARTIALLY_MILLED"])
    .optional(),
  district: z.string().max(100).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

// ─── MILLING BATCHES ─────────────────────────────────────────────────────────

export const CreateMillingBatchSchema = z.object({
  millId: IdSchema,
  variety: z.enum([
    "BASMATI_1121",
    "BASMATI_386",
    "BASMATI_SUPER",
    "PARBOILED",
    "IRRI_6",
    "IRRI_9",
    "OTHER",
  ]),
  startDate: z.coerce.date(),
  paddyInputKg: z.number().positive(),
  notes: z.string().max(2000).optional(),
});

export const UpdateMillingBatchSchema = z.object({
  endDate: z.coerce.date().optional(),
  outputWhiteKg: z.number().nonnegative().optional(),
  outputBrokenKg: z.number().nonnegative().optional(),
  outputBranKg: z.number().nonnegative().optional(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "QUALITY_HOLD"]).optional(),
  notes: z.string().max(2000).optional(),
});

export const LinkLotToBatchSchema = z.object({
  lotId: IdSchema,
  weightUsedKg: z.number().positive("Weight used must be positive"),
});

export const BatchQuerySchema = PaginationSchema.extend({
  millId: IdSchema.optional(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "QUALITY_HOLD"]).optional(),
  variety: z
    .enum([
      "BASMATI_1121",
      "BASMATI_386",
      "BASMATI_SUPER",
      "PARBOILED",
      "IRRI_6",
      "IRRI_9",
      "OTHER",
    ])
    .optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

// ─── LAB TESTS ───────────────────────────────────────────────────────────────

export const CreateLabTestSchema = z.object({
  millingBatchId: IdSchema,
  testType: z.enum([
    "PESTICIDE_RESIDUE",
    "HEAVY_METALS",
    "MOISTURE",
    "PHYSICAL_INSPECTION",
    "MYCOTOXIN",
    "FULL_PANEL",
  ]),
  labName: z.string().min(2).max(200),
  testDate: z.coerce.date(),
  reportNumber: z.string().max(100).optional(),
  moisturePercent: z.number().min(0).max(100).optional(),
  brokenPercent: z.number().min(0).max(100).optional(),
  chalkyPercent: z.number().min(0).max(100).optional(),
  foreignMatterPercent: z.number().min(0).max(100).optional(),
  pesticideResult: z.string().max(500).optional(),
  heavyMetalResult: z.string().max(500).optional(),
  mycotoxinResult: z.string().max(500).optional(),
  customResults: z.record(z.string()).optional(),
  overallResult: z
    .enum(["PENDING", "PASS", "FAIL", "CONDITIONAL"])
    .default("PENDING"),
  notes: z.string().max(2000).optional(),
});

export const UpdateLabTestSchema = CreateLabTestSchema.partial().omit({
  millingBatchId: true,
  testType: true,
});

export const LabTestQuerySchema = PaginationSchema.extend({
  batchId: IdSchema.optional(),
  result: z.enum(["PENDING", "PASS", "FAIL", "CONDITIONAL"]).optional(),
  testType: z
    .enum([
      "PESTICIDE_RESIDUE",
      "HEAVY_METALS",
      "MOISTURE",
      "PHYSICAL_INSPECTION",
      "MYCOTOXIN",
      "FULL_PANEL",
    ])
    .optional(),
});

// ─── BUYERS ──────────────────────────────────────────────────────────────────

export const CreateBuyerSchema = z.object({
  companyName: z.string().min(2).max(300),
  country: z.string().min(2).max(100),
  contactName: z.string().max(150).optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(30).optional(),
});

export const UpdateBuyerSchema = CreateBuyerSchema.partial();

// ─── SHIPMENTS ───────────────────────────────────────────────────────────────

export const CreateShipmentSchema = z.object({
  buyerId: IdSchema,
  invoiceNumber: z.string().max(100).optional(),
  lcNumber: z.string().max(100).optional(),
  portOfLoading: z.string().max(200).optional(),
  portOfDischarge: z.string().max(200).optional(),
  vesselName: z.string().max(200).optional(),
  billOfLadingNo: z.string().max(100).optional(),
  shipmentDate: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
});

export const UpdateShipmentSchema = CreateShipmentSchema.partial().omit({
  buyerId: true,
}).extend({
  status: z
    .enum([
      "DRAFT",
      "UNDER_REVIEW",
      "CERTIFICATE_ISSUED",
      "SHIPPED",
      "DELIVERED",
    ])
    .optional(),
  dueDiligenceConfirmed: z.boolean().optional(),
});

export const AddShipmentItemSchema = z.object({
  millingBatchId: IdSchema,
  weightKg: z.number().positive(),
});

export const ShipmentQuerySchema = PaginationSchema.extend({
  buyerId: IdSchema.optional(),
  status: z
    .enum([
      "DRAFT",
      "UNDER_REVIEW",
      "CERTIFICATE_ISSUED",
      "SHIPPED",
      "DELIVERED",
    ])
    .optional(),
  complianceStatus: z
    .enum(["INCOMPLETE", "AT_RISK", "COMPLIANT"])
    .optional(),
});
