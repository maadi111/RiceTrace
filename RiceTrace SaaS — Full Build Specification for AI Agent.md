# RiceTrace SaaS — Full Build Specification for AI Agent

## 1. Product Overview & Mission

## 1. Product Overview & Mission

**RiceTrace** — Rice Mill Export Compliance & Traceability SaaS for Pakistan.

### The Problem

Pakistan exports $2.5B+ of Basmati and non-Basmati rice annually to the EU, UK, Middle East, and US. As of 2024, the EU Deforestation Regulation (EUDR) and SPS (Sanitary and Phytosanitary) measures require rice exporters to prove:

- Exactly which farms the paddy came from (GPS coordinates of field)
- What pesticides and fertilizers were used
- That land was not converted from forest after December 31, 2020
- Full chain of custody from farm → mill → export lot
- Lab test results for contaminants, pesticide residue, and moisture

Pakistani rice mills currently track none of this. Procurement is in handwritten registers or Excel. Milling batches are not traced back to procurement lots. Lab results sit in paper binders. International buyers are already sending compliance questionnaires mills cannot answer. Contracts will be lost.

### The Solution

RiceTrace is a web + mobile SaaS where:

1. A procurement officer at the farm gate enters paddy lot details on their phone (farmer CNIC, field GPS, weight, variety, date)
2. The mill manager links milling batches to procurement lots
3. The quality/lab manager uploads test certificates
4. The export manager generates a buyer-ready traceability certificate for any shipment in one click
5. The international buyer logs into a branded read-only portal to verify compliance status in real time

### What RiceTrace Is NOT

- Not an ERP or full accounting system
- Not an IoT/sensor product — zero hardware required
- Not a logistics or shipping management platform
- Not a B2C consumer app

### Revenue Model

| Tier | Users | Price (PKR/month) | Price (USD/month) |
| --- | --- | --- | --- |
| Starter | 1 mill, 5 users | PKR 45,000 | \~$160 |
| Professional | 1 mill, 15 users + buyer portal | PKR 95,000 | \~$340 |
| Enterprise | Multi-mill, unlimited users + API | PKR 200,000+ | \~$720+ |

## 2. User Personas & Roles

## 2. User Personas & Roles

### Role Definitions

| Role | Who They Are | Primary Device | Key Actions |
| --- | --- | --- | --- |
| **Mill Admin** | Mill owner or GM | Desktop | Full access, billing, user management, all reports |
| **Procurement Officer** | Field buyer who visits farms | Mobile (phone) | Register farmers, log paddy lots, enter GPS, upload photos |
| **Mill Manager** | Factory floor manager | Desktop/tablet | Create milling batches, link to procurement lots, log output |
| **Quality / Lab Manager** | QC in-charge | Desktop | Log lab tests, upload certificates, manage pesticide records |
| **Export Manager** | Handles documentation and buyers | Desktop | Create shipments, generate traceability certificates, manage buyers |
| **Buyer (Read-Only)** | International buyer or sourcing office | Desktop | View assigned shipment compliance status, download certificates |

### Permission Matrix

| Feature | Mill Admin | Procurement Officer | Mill Manager | Quality Manager | Export Manager | Buyer |
| --- | --- | --- | --- | --- | --- | --- |
| Register farmers | ✓ | ✓ | — | — | — | — |
| Log paddy lots | ✓ | ✓ | — | — | — | — |
| Create milling batches | ✓ | — | ✓ | — | — | — |
| Log lab tests | ✓ | — | — | ✓ | — | — |
| Upload lab certificates | ✓ | — | — | ✓ | — | — |
| Create shipments | ✓ | — | — | — | ✓ | — |
| Generate certificates | ✓ | — | — | — | ✓ | — |
| View buyer portal | ✓ | — | — | — | ✓ | ✓ |
| Manage users | ✓ | — | — | — | — | — |
| View analytics dashboard | ✓ | — | — | — | ✓ | — |

### Key UX Notes Per Role

**Procurement Officer (Mobile-First Priority)** This is the most critical field role. They are at the farm gate, often with poor internet. The mobile UI must:

- Work offline and sync when connectivity returns
- Use the phone camera to capture CNIC photos and GPS coordinates automatically
- Have very large tap targets, minimal typing — prefer dropdowns and number inputs
- Support Urdu and English language toggle

**Buyer (External Stakeholder)** Buyers are international (EU, UK, Middle East). Their portal must:

- Require no account creation — access via a magic link per shipment
- Display compliance status with clear green/yellow/red indicators
- Allow PDF download of the traceability certificate
- Display farm GPS coordinates on a map

## 3. Tech Stack & Architecture

## 3. Tech Stack & Architecture

### Frontend — Web App

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui component library
- **State management:** Zustand for global state, React Query (TanStack Query) for server state and caching
- **Forms:** React Hook Form + Zod for validation
- **Maps:** Leaflet.js (open source, no API key cost) for GPS field visualization
- **PDF rendering in-browser:** react-pdf for traceability certificate preview
- **Language i18n:** next-intl for English / Urdu toggle

### Mobile App — Procurement Officer Field App

- **Approach:** Progressive Web App (PWA) served from the same Next.js app — no separate React Native build needed at MVP stage
- **Offline support:** Workbox service worker + IndexedDB (via Dexie.js) to store form data offline, sync when online
- **Camera/GPS:** browser native APIs (navigator.geolocation, input type=file accept=camera) — no hardware SDKs needed

### Backend — API Server

- **Framework:** Node.js with Express.js (or Fastify for performance)
- **Language:** TypeScript throughout
- **ORM:** Prisma (PostgreSQL adapter)
- **Authentication:** JWT access tokens (15 min expiry) + refresh tokens (30 days) stored in httpOnly cookies
- **File uploads:** Multer middleware → S3-compatible storage
- **PDF generation (server-side):** Puppeteer or @react-pdf/renderer running server-side for certificate generation
- **Email:** Nodemailer + AWS SES for buyer magic links, alerts
- **Job queue:** BullMQ + Redis for async tasks (PDF generation, email sending, compliance score recalculation)
- **Validation:** Zod schemas shared between frontend and backend (monorepo)

### Database

- **Primary DB:** PostgreSQL 16 on AWS RDS (or Supabase for managed option)
- **Caching:** Redis (Upstash for serverless, or ElastiCache) for sessions, job queues, rate limiting
- **File storage:** AWS S3 (or Cloudflare R2 for cost) for lab certificate PDFs, CNIC photos, farm photos

### Infrastructure

- **Hosting:** Vercel for Next.js frontend + serverless API routes; OR Railway.app for backend API if separate Express server
- **Database:** Supabase (managed Postgres) recommended for solo/small team build speed
- **Domain / CDN:** Cloudflare (free tier) in front of everything
- **Monitoring:** Sentry for error tracking; Posthog for product analytics
- **Environment secrets:** Doppler or .env files managed per environment

### Monorepo Structure

```
ricetrace/
├── apps/
│   ├── web/              # Next.js app (mill dashboard + PWA field app)
│   └── api/              # Express API server (if not using Next.js API routes)
├── packages/
│   ├── db/               # Prisma schema + client
│   ├── types/            # Shared TypeScript types
│   ├── validators/       # Shared Zod schemas
│   └── pdf-templates/    # Certificate PDF templates
├── package.json          # Turborepo workspace root
└── turbo.json
```

### Third-Party Integrations (MVP)

- **JazzCash / EasyPaisa:** Not needed at MVP; subscription billing via manual bank transfer initially
- **EUDR Forest Cover API:** Global Forest Watch API (free) for automated deforestation risk check by GPS coordinates
- **WeBOC (Pakistan Customs):** Read-only integration to pull GD numbers for shipment records — optional Phase 2

## 4. Database Schema (Full)

## 4. Database Schema (Full PostgreSQL / Prisma)

Below is the complete Prisma schema. AI agent must create all migrations from this.

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── MULTI-TENANCY ───────────────────────────────────────────────────────────

model Organization {
  id          String   @id @default(cuid())
  name        String                         // Mill or Trading Company name
  slug        String   @unique               // URL slug for branding
  plan        Plan     @default(STARTER)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users         User[]
  mills         Mill[]
  buyers        Buyer[]
  farmers       Farmer[]
  procurementLots ProcurementLot[]
  millingBatches  MillingBatch[]
  shipments     Shipment[]
  labTests      LabTest[]
}

enum Plan {
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

// ─── USERS & AUTH ────────────────────────────────────────────────────────────

model User {
  id             String    @id @default(cuid())
  organizationId String
  email          String    @unique
  passwordHash   String
  name           String
  role           UserRole
  language       Language  @default(EN)
  isActive       Boolean   @default(true)
  lastLoginAt    DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  organization   Organization  @relation(fields: [organizationId], references: [id])
  procurementLots ProcurementLot[] @relation("CreatedBy")
  millingBatches  MillingBatch[]   @relation("CreatedBy")
  labTests        LabTest[]        @relation("CreatedBy")
  shipments       Shipment[]       @relation("CreatedBy")
}

enum UserRole {
  MILL_ADMIN
  PROCUREMENT_OFFICER
  MILL_MANAGER
  QUALITY_MANAGER
  EXPORT_MANAGER
}

enum Language {
  EN
  UR
}

// ─── MILLS ───────────────────────────────────────────────────────────────────

model Mill {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  licenseNumber  String?  // Pakistan Rice Exporters Association license
  address        String
  district       String
  province       String   @default("Punjab")
  geoLat         Float?
  geoLng         Float?
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())

  organization    Organization     @relation(fields: [organizationId], references: [id])
  procurementLots ProcurementLot[]
  millingBatches  MillingBatch[]
}

// ─── FARMERS & FARMS ─────────────────────────────────────────────────────────

model Farmer {
  id             String   @id @default(cuid())
  organizationId String
  cnic           String                      // National ID — used as unique identifier
  name           String
  fatherName     String?
  phone          String?
  village        String?
  union          String?                     // Union Council
  tehsil         String?
  district       String
  cnicPhotoUrl   String?                     // S3 URL of CNIC scan
  isVerified     Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id])
  farms        Farm[]
  procurementLots ProcurementLot[]

  @@unique([organizationId, cnic])
}

model Farm {
  id              String   @id @default(cuid())
  farmerId        String
  name            String?                    // Optional field name
  areaAcres       Float                      // Farm size
  geoLat          Float                      // GPS latitude — required for EUDR
  geoLng          Float                      // GPS longitude — required for EUDR
  geoPolygon      Json?                      // Optional GeoJSON polygon of field boundary
  district        String
  tehsil          String?
  landTitle       String?                    // Fard/Khasra number
  eudrRiskLevel   EudrRisk @default(PENDING) // Computed from Global Forest Watch API
  eudrCheckedAt   DateTime?
  photoUrls       String[]                   // Array of S3 URLs for field photos
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  farmer          Farmer           @relation(fields: [farmerId], references: [id])
  procurementLots ProcurementLot[]
}

enum EudrRisk {
  PENDING
  LOW       // No deforestation detected
  MEDIUM    // Flagged for manual review
  HIGH      // High risk — cannot be included in EU shipments
}

// ─── PROCUREMENT LOTS ────────────────────────────────────────────────────────

model ProcurementLot {
  id              String          @id @default(cuid())
  lotNumber       String          @unique  // Auto-generated: LOT-2024-00001
  organizationId  String
  millId          String
  farmerId        String
  farmId          String
  createdById     String
  
  variety         RiceVariety
  weightKg        Float
  moisturePercent Float?
  dateReceived    DateTime
  vehicleNumber   String?         // Truck/tractor number
  
  // Pesticide/input declaration (self-reported by farmer)
  pesticidesUsed  PesticideRecord[]
  fertilizersUsed FertilizerRecord[]
  
  gpsLat          Float?          // GPS at time of purchase (may differ from farm GPS)
  gpsLng          Float?
  photoUrls       String[]
  notes           String?
  
  status          LotStatus       @default(RECEIVED)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  organization    Organization     @relation(fields: [organizationId], references: [id])
  mill            Mill             @relation(fields: [millId], references: [id])
  farmer          Farmer           @relation(fields: [farmerId], references: [id])
  farm            Farm             @relation(fields: [farmId], references: [id])
  createdBy       User             @relation("CreatedBy", fields: [createdById], references: [id])
  batchLinks      BatchLotLink[]
}

enum LotStatus {
  RECEIVED
  IN_MILLING
  MILLED
  PARTIALLY_MILLED
}

enum RiceVariety {
  BASMATI_1121
  BASMATI_386
  BASMATI_SUPER
  PARBOILED
  IRRI_6
  IRRI_9
  OTHER
}

model PesticideRecord {
  id                String          @id @default(cuid())
  procurementLotId  String
  name              String          // Pesticide trade name
  activeIngredient  String?         // e.g. Chlorpyrifos
  applicationDate   DateTime?
  daysBeforeHarvest Int?            // PHI (Pre-Harvest Interval)
  doseLitersPerAcre Float?
  procurementLot    ProcurementLot  @relation(fields: [procurementLotId], references: [id])
}

model FertilizerRecord {
  id                String          @id @default(cuid())
  procurementLotId  String
  name              String
  npkRatio          String?         // e.g. "46-0-0"
  applicationDate   DateTime?
  procurementLot    ProcurementLot  @relation(fields: [procurementLotId], references: [id])
}

// ─── MILLING BATCHES ─────────────────────────────────────────────────────────

model MillingBatch {
  id              String   @id @default(cuid())
  batchNumber     String   @unique  // Auto-generated: BATCH-2024-00001
  organizationId  String
  millId          String
  createdById     String
  
  variety         RiceVariety
  startDate       DateTime
  endDate         DateTime?
  paddyInputKg    Float            // Total paddy used
  outputWhiteKg   Float?           // White rice output
  outputBrokenKg  Float?           // Broken rice output
  outputBranKg    Float?           // Bran output
  millingYield    Float?           // Computed: outputWhiteKg / paddyInputKg * 100
  
  status          BatchStatus      @default(IN_PROGRESS)
  notes           String?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  organization    Organization     @relation(fields: [organizationId], references: [id])
  mill            Mill             @relation(fields: [millId], references: [id])
  createdBy       User             @relation("CreatedBy", fields: [createdById], references: [id])
  lotLinks        BatchLotLink[]
  labTests        LabTest[]
  shipmentItems   ShipmentItem[]
}

enum BatchStatus {
  IN_PROGRESS
  COMPLETED
  QUALITY_HOLD
}

// Junction table: many lots → many batches
model BatchLotLink {
  id                String         @id @default(cuid())
  millingBatchId    String
  procurementLotId  String
  weightUsedKg      Float          // How much of this lot went into this batch
  
  millingBatch      MillingBatch   @relation(fields: [millingBatchId], references: [id])
  procurementLot    ProcurementLot @relation(fields: [procurementLotId], references: [id])
  
  @@unique([millingBatchId, procurementLotId])
}

// ─── LAB TESTS ───────────────────────────────────────────────────────────────

model LabTest {
  id              String        @id @default(cuid())
  organizationId  String
  millingBatchId  String
  createdById     String
  
  testType        LabTestType
  labName         String        // External lab name e.g. PCSIR, SGS, Intertek
  testDate        DateTime
  reportNumber    String?
  certificateUrl  String?       // S3 URL of lab PDF
  
  // Test result fields
  moisturePercent     Float?
  brokenPercent       Float?
  chalkyPercent       Float?
  foreignMatterPercent Float?
  pesticideResult     String?   // PASS / FAIL / specific residue detected
  heavyMetalResult    String?
  mycotoxinResult     String?
  customResults       Json?     // Flexible key-value for additional parameters
  
  overallResult   LabResult     @default(PENDING)
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  organization    Organization  @relation(fields: [organizationId], references: [id])
  millingBatch    MillingBatch  @relation(fields: [millingBatchId], references: [id])
  createdBy       User          @relation("CreatedBy", fields: [createdById], references: [id])
}

enum LabTestType {
  PESTICIDE_RESIDUE
  HEAVY_METALS
  MOISTURE
  PHYSICAL_INSPECTION
  MYCOTOXIN
  FULL_PANEL
}

enum LabResult {
  PENDING
  PASS
  FAIL
  CONDITIONAL  // Pass with notes
}

// ─── BUYERS & SHIPMENTS ──────────────────────────────────────────────────────

model Buyer {
  id              String   @id @default(cuid())
  organizationId  String
  companyName     String
  country         String
  contactName     String?
  contactEmail    String
  contactPhone    String?
  portalAccessToken String? @unique   // Magic link token for buyer portal
  tokenExpiresAt  DateTime?
  createdAt       DateTime @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id])
  shipments       Shipment[]
}

model Shipment {
  id              String          @id @default(cuid())
  shipmentNumber  String          @unique  // e.g. SHP-2024-00001
  organizationId  String
  buyerId         String
  createdById     String
  
  invoiceNumber   String?
  lcNumber        String?         // Letter of Credit number
  portOfLoading   String?         // e.g. Port Qasim, Karachi
  portOfDischarge String?         // e.g. Rotterdam, Hamburg
  vesselName      String?
  billOfLadingNo  String?
  shipmentDate    DateTime?
  
  complianceScore  Int?           // 0-100 computed score
  complianceStatus ComplianceStatus @default(INCOMPLETE)
  
  certificateUrl  String?         // Generated PDF URL
  certificateGeneratedAt DateTime?
  
  status          ShipmentStatus  @default(DRAFT)
  notes           String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  organization    Organization    @relation(fields: [organizationId], references: [id])
  buyer           Buyer           @relation(fields: [buyerId], references: [id])
  createdBy       User            @relation("CreatedBy", fields: [createdById], references: [id])
  items           ShipmentItem[]
}

model ShipmentItem {
  id              String       @id @default(cuid())
  shipmentId      String
  millingBatchId  String
  weightKg        Float        // Weight from this batch included in shipment
  
  shipment        Shipment     @relation(fields: [shipmentId], references: [id])
  millingBatch    MillingBatch @relation(fields: [millingBatchId], references: [id])
}

enum ComplianceStatus {
  INCOMPLETE   // Missing required data
  AT_RISK      // Has EUDR high-risk lots or failed lab tests
  COMPLIANT    // All checks passed
}

enum ShipmentStatus {
  DRAFT
  UNDER_REVIEW
  CERTIFICATE_ISSUED
  SHIPPED
  DELIVERED
}
```

## 5. Core Modules & Feature Specifications

## 5. Core Modules & Feature Specifications

### Module 1 — Farmer & Farm Registry

**Purpose:** Create a permanent, verified database of every farmer the mill procures from.

**Features:**

- Register a new farmer with CNIC number, name, father's name, phone, address
- Upload CNIC photo (front + back) via phone camera
- Add one or more farms per farmer — each farm requires: GPS coordinates (auto-captured from device), area in acres, district/tehsil, khasra number (optional), field photos
- Auto-trigger EUDR deforestation risk check via Global Forest Watch API using the farm GPS coordinates — store result (LOW/MEDIUM/HIGH) and check date
- Search/filter farmers by CNIC, name, district
- View farmer profile with all farms, all procurement lots, and EUDR status
- Bulk import farmers from Excel template (Phase 2)

**Business Logic:**

- CNIC must be exactly 13 digits — validate on entry
- Farm GPS is mandatory, not optional — UI must block lot creation if farm has no GPS
- EUDR check runs automatically on farm creation; can be manually re-triggered
- A farm flagged HIGH EUDR risk shows a red banner; lots from this farm are blocked from EU-bound shipments

---

### Module 2 — Procurement Lot Entry (Field Mobile Flow)

**Purpose:** Digital log of every paddy lot purchased from a farmer at or near the farm gate.

**Features:**

- Select farmer (search by CNIC or name) and select farm
- Enter: variety, weight in kg/mounds (auto-convert), date received, vehicle number, moisture reading (optional)
- Pesticide declaration: add one or more pesticides used (name, active ingredient, date applied, days before harvest) — farmer-declared on honor system
- Fertilizer declaration: add fertilizers used (name, NPK, date)
- Capture GPS at moment of entry (phone location)
- Add photos (field condition, truck, weight slip)
- Auto-generate lot number (LOT-YYYY-MMDD-XXXX)
- **Offline mode:** All fields save locally in IndexedDB; sync to server when connection restored; show sync status badge

**Business Logic:**

- If farm EUDR status is HIGH, show warning but allow entry — block only at shipment stage
- Lot weight must be positive; moisture must be 0–30%
- Lot is assigned to the currently logged-in user's mill by default

---

### Module 3 — Milling Batch Management

**Purpose:** Track the conversion of paddy lots into milled rice and link input lots to output batches.

**Features:**

- Create a milling batch: variety, start date, mill
- Link multiple procurement lots to a batch (with weight used from each lot)
- Validation: total weight from linked lots must be ≥ batch paddy input weight
- Enter outputs: white rice kg, broken rice kg, bran kg
- Auto-calculate milling yield percentage
- Track batch status: In Progress → Completed → Quality Hold
- View traceability summary: which farms, farmers, districts contributed to this batch
- Batch timeline view: see linked lots, their farms, EUDR risk per farm

**Business Logic:**

- A lot can be split across multiple batches (partial milling) — track weight used per link
- A batch cannot be marked Complete until at least one lot is linked
- Milling yield outside 50–75% triggers a warning (possible data entry error)

---

### Module 4 — Quality & Lab Test Management

**Purpose:** Manage lab tests, certificates, and compliance thresholds for all milling batches.

**Features:**

- Log a lab test: select batch, test type, lab name, test date, report number
- Upload lab certificate PDF (S3 storage)
- Enter test result fields: moisture %, broken %, pesticide result, heavy metals, mycotoxin
- Mark overall result: PASS / FAIL / CONDITIONAL
- Custom result fields: key-value pairs for parameters not in the standard form
- Batch compliance indicator: batch shows green (all PASS), yellow (CONDITIONAL or missing), red (FAIL)
- Lab certificate download from anywhere in the system
- Expiry alerts: if a test is older than 90 days when shipment is being created, show warning

**Business Logic:**

- At least one PESTICIDE\_RESIDUE test is required for any batch going into an EU-bound shipment
- FAIL result on any test blocks the batch from shipment inclusion (can be overridden by MILL\_ADMIN with a note)
- Lab name must be from a whitelist of accredited labs (editable by admin)

---

### Module 5 — Buyer Management

**Purpose:** Manage international buyer profiles and control their access to the compliance portal.

**Features:**

- Add buyer: company name, country, contact name, email, phone
- Generate a magic link for buyer portal access — expires in 90 days (renewable)
- Assign specific shipments to a buyer
- View all shipments per buyer with compliance status
- Revoke portal access instantly
- Email magic link directly to buyer from the system

---

### Module 6 — Shipment & Certificate Management

**Purpose:** Create export shipments from milling batches and generate compliance traceability certificates.

**Features:**

- Create shipment: assign buyer, invoice number, L/C number, port of loading, port of discharge, vessel name
- Add shipment items: select milling batches + weight from each batch
- Auto-calculate compliance score (0–100) based on:
  - Lot traceability completeness (are all input lots linked? do all farms have GPS?)
  - EUDR risk status of all contributing farms
  - Lab test results for all contributing batches
  - Pesticide declarations present?
- Show compliance checklist: green tick / red cross per requirement
- Generate traceability certificate PDF: one click, server-rendered, includes all data points
- Share certificate: send to buyer via email with download link OR buyer accesses via their portal
- Shipment status tracking: Draft → Under Review → Certificate Issued → Shipped → Delivered

**Business Logic:**

- Compliance score calculation:
  - +25 pts: all farms have GPS coordinates
  - +25 pts: all farms have EUDR LOW risk
  - +25 pts: all contributing batches have PASS lab test (pesticide)
  - +25 pts: all lots have pesticide declaration
  - Deductions for EUDR HIGH (-25), FAIL lab test (-25), missing GPS (-15), missing declaration (-10)
- Certificate cannot be generated if compliance score < 60 (configurable threshold)

---

### Module 7 — Buyer Portal (External Read-Only)

**Purpose:** Give international buyers a professional, verified view of their shipment compliance data.

**Features:**

- Accessed via magic link (no login required)
- Branded with mill/org logo and name
- Shows assigned shipments with compliance status badge
- Per shipment: compliance score, checklist breakdown, list of contributing farms with GPS map, lab certificates downloadable as PDF
- Farms shown on Leaflet.js interactive map with markers
- Download traceability certificate button
- Language: English only (buyer-facing)

---

### Module 8 — Dashboard & Analytics

**Purpose:** Give the Mill Admin and Export Manager real-time visibility across operations.

**Metrics shown:**

- Total paddy procured this season (kg) vs last season
- Total milling batches completed
- Compliance score average across all shipments
- Lots with missing GPS (%) — key risk indicator
- Farms with EUDR HIGH risk (count)
- Lab tests pending / failed (count)
- Shipments by status (pipeline view)
- Top 5 districts by paddy volume (bar chart)
- Procurement officer activity (lots entered per officer)

## 6. API Endpoint Design

## 6. API Endpoint Design

All endpoints are prefixed `/api/v1/`. All require `Authorization: Bearer <token>` except `/auth/*` and `/buyer-portal/*`.

### Authentication

```
POST   /auth/login                   # { email, password } → { accessToken, refreshToken, user }
POST   /auth/refresh                  # { refreshToken } → { accessToken }
POST   /auth/logout                   # Invalidate refresh token
GET    /auth/me                       # Current user profile
```

### Farmers

```
GET    /farmers                       # List farmers (org-scoped, paginated, searchable)
POST   /farmers                       # Create farmer { cnic, name, fatherName, phone, ... }
GET    /farmers/:id                   # Get farmer detail + farms + lot history
PATCH  /farmers/:id                   # Update farmer info
POST   /farmers/:id/cnic-photo        # Upload CNIC photo → returns S3 URL

GET    /farmers/:id/farms             # List farms for a farmer
POST   /farmers/:id/farms             # Create farm { geoLat, geoLng, areaAcres, district, ... }
GET    /farmers/:farmerId/farms/:id   # Farm detail + EUDR status + lot history
PATCH  /farmers/:farmerId/farms/:id   # Update farm
POST   /farmers/:farmerId/farms/:id/eudr-check  # Manually re-trigger EUDR API check
POST   /farmers/:farmerId/farms/:id/photos      # Upload farm photos
```

### Procurement Lots

```
GET    /lots                          # List lots (filter: millId, farmerId, status, dateRange, variety)
POST   /lots                          # Create lot (full payload including pesticide/fertilizer arrays)
GET    /lots/:id                      # Lot detail + linked batches + farm/farmer info
PATCH  /lots/:id                      # Update lot (before milling begins)
POST   /lots/:id/photos               # Upload lot photos → S3 URLs appended
GET    /lots/:id/traceability         # Full traceability chain for this lot

POST   /lots/:id/pesticides           # Add pesticide record to a lot
DELETE /lots/:id/pesticides/:pid      # Remove pesticide record
```

### Milling Batches

```
GET    /batches                       # List batches (filter: millId, status, variety, dateRange)
POST   /batches                       # Create batch { millId, variety, startDate, paddyInputKg }
GET    /batches/:id                   # Batch detail + linked lots + lab tests + traceability
PATCH  /batches/:id                   # Update batch (outputs, status)

POST   /batches/:id/lots              # Link a lot to batch { lotId, weightUsedKg }
DELETE /batches/:id/lots/:lotId       # Unlink a lot from batch
GET    /batches/:id/traceability      # Full farm-to-mill chain for this batch
```

### Lab Tests

```
GET    /lab-tests                     # List tests (filter: batchId, result, testType)
POST   /lab-tests                     # Create test { millingBatchId, testType, labName, testDate, ... }
GET    /lab-tests/:id                 # Test detail
PATCH  /lab-tests/:id                 # Update result fields
POST   /lab-tests/:id/certificate     # Upload lab certificate PDF → S3 URL stored
DELETE /lab-tests/:id/certificate     # Remove certificate
```

### Buyers

```
GET    /buyers                        # List buyers
POST   /buyers                        # Create buyer { companyName, country, contactEmail, ... }
GET    /buyers/:id                    # Buyer detail + shipments
PATCH  /buyers/:id                    # Update buyer info
POST   /buyers/:id/portal-link        # Generate/renew magic link → returns full URL
DELETE /buyers/:id/portal-link        # Revoke portal access
POST   /buyers/:id/send-portal-link   # Send magic link to buyer email
```

### Shipments

```
GET    /shipments                     # List shipments (filter: buyerId, status, complianceStatus)
POST   /shipments                     # Create shipment { buyerId, invoiceNumber, lcNumber, ... }
GET    /shipments/:id                 # Full shipment detail + compliance score + checklist
PATCH  /shipments/:id                 # Update shipment fields

POST   /shipments/:id/items           # Add batch to shipment { millingBatchId, weightKg }
DELETE /shipments/:id/items/:itemId   # Remove batch from shipment

GET    /shipments/:id/compliance      # Compute and return compliance score + detailed checklist
POST   /shipments/:id/certificate     # Generate traceability certificate PDF (async via BullMQ)
GET    /shipments/:id/certificate/download  # Download generated certificate PDF
```

### Buyer Portal (No Auth — Token-Based)

```
GET    /buyer-portal/:token/validate  # Validate magic link token → org info, buyer name
GET    /buyer-portal/:token/shipments # List shipments accessible to this buyer
GET    /buyer-portal/:token/shipments/:id  # Shipment detail with compliance data
GET    /buyer-portal/:token/shipments/:id/certificate  # Download certificate PDF
```

### Dashboard & Analytics

```
GET    /dashboard/summary             # Key metrics for the org (season totals, compliance avg)
GET    /dashboard/procurement-stats   # Procurement volume by district, variety, officer
GET    /dashboard/compliance-overview # Breakdown of lot/batch/shipment compliance status
GET    /dashboard/eudr-risk-map       # All farms with GPS + EUDR risk level (for map display)
```

### Admin / Organization

```
GET    /org/users                     # List users in org
POST   /org/users                     # Invite user { email, name, role }
PATCH  /org/users/:id                 # Update user role / deactivate
GET    /org/mills                     # List mills
POST   /org/mills                     # Add a mill { name, address, district, licenseNumber }
PATCH  /org/mills/:id                 # Update mill
```

### Error Response Standard

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "CNIC must be exactly 13 digits",
    "field": "cnic"
  }
}
```

### Success Response Standard

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

## 7. UI/UX Screens & Flow

## 7. UI/UX Screens & Navigation

### Navigation Structure (Sidebar — Desktop)

```
📊 Dashboard
👨‍🌾 Farmers
   └─ Farmer List
   └─ Add Farmer
   └─ Farm Registry
🌾 Procurement
   └─ Lot List
   └─ New Lot Entry
🏭 Milling
   └─ Batch List
   └─ New Batch
🔬 Quality & Lab
   └─ Lab Tests
   └─ Upload Certificate
🚢 Export
   └─ Shipments
   └─ Buyers
   └─ Certificates
⚙️ Settings
   └─ Users
   └─ Mills
   └─ Organization
```

### Screen-by-Screen Specifications

**SCREEN 1 — Login**

- Email + password fields
- Language toggle (EN | UR) in top right
- Forgot password link
- No registration flow — admin creates users for their org

**SCREEN 2 — Dashboard**

- Top row: 4 stat cards (Paddy Procured this Month, Active Batches, Pending Lab Tests, Shipments in Progress)
- EUDR Alert banner: if any HIGH risk farms exist, show a red banner: "X farms have high EUDR risk. Review before shipping to EU."
- Compliance score donut chart for the current season
- Procurement volume bar chart by week
- Recent activity feed (last 10 actions by any user)
- Quick action buttons: New Lot Entry, New Batch, New Shipment

**SCREEN 3 — Farmer List**

- Search bar (CNIC or name)
- Filter: district, EUDR risk
- Table: Name, CNIC (masked), District, Farms count, Total Lots, EUDR Status badge, Actions
- Add Farmer button (top right)

**SCREEN 4 — Add / Edit Farmer (Desktop)**

- Step 1 — Basic Info: name, father's name, CNIC (validated as 13 digits), phone, village, union council, tehsil, district
- Step 2 — CNIC Photo: two upload zones (front / back) with camera capture option
- Step 3 — Confirm: review and submit

**SCREEN 5 — Farmer Profile**

- Header: farmer name, CNIC, district, verification badge
- Tabs: Farms | Procurement History | Stats
- Farms tab: card per farm showing GPS map thumbnail, area, EUDR status badge, khasra number
- Add Farm button on Farms tab

**SCREEN 6 — Add Farm (Desktop + Mobile)**

- Field name (optional), area in acres, district, tehsil, khasra number
- GPS section: "Tap to capture GPS" button — shows lat/lng after capture; map pin preview
- Field photos upload (multi-photo)
- EUDR check is triggered automatically on save — show spinner then result

**SCREEN 7 — New Lot Entry (MOBILE-FIRST — critical screen)**

- Design for a Procurement Officer using a phone at the farm
- Step 1 — Find Farmer: large search bar, search by CNIC or name; if new farmer, tap "Register New Farmer"
- Step 2 — Select Farm: shows farmer's farms as cards with GPS indicator; if no GPS, show warning
- Step 3 — Lot Details: variety (large radio buttons), weight kg (large number input), date (date picker defaults to today), vehicle number, moisture (optional)
- Step 4 — Pesticide Declaration: "Any pesticides used?" Yes/No toggle. If Yes: add pesticide form (searchable dropdown for common names + free text, PHI in days)
- Step 5 — Photos: camera button prominently displayed; minimum 1 photo recommended
- Step 6 — GPS: "Capture my current location" button with large GPS icon
- Step 7 — Confirm: summary of all entered data, submit button
- Offline indicator at top if no internet — "Working offline. Data will sync when online."
- After submit: show lot number generated (e.g. LOT-2024-1115-0042) with option to print/share via WhatsApp

**SCREEN 8 — Lot List (Desktop)**

- Table: Lot#, Farmer, District, Variety, Weight (kg), Date, Status, EUDR flag, Actions
- Filters: date range, variety, district, mill, status
- Click row → Lot Detail

**SCREEN 9 — Lot Detail**

- Header: lot number, status badge
- Cards: Farmer info (with CNIC), Farm info (GPS map, EUDR badge), Lot details, Pesticide declarations
- Linked batches section
- Photos gallery
- Traceability chain: Farmer → Farm → Lot → Batch → Shipment (if applicable)

**SCREEN 10 — New Milling Batch**

- Mill selector, variety, start date, paddy input kg
- Link Lots section: search and add lots by lot number or farmer; shows weight from each lot; validates total
- Output fields: white rice kg, broken kg, bran kg (auto-calculates yield)
- Batch number auto-generated

**SCREEN 11 — Batch Detail**

- Header: batch number, status, yield %
- Linked lots table with farm names and EUDR status
- Lab tests section: list of tests + quick Add Test button
- Traceability map: all contributing farms plotted on Leaflet map with EUDR color coding
- Compliance indicators: green/yellow/red per category

**SCREEN 12 — Add Lab Test**

- Select batch, test type, lab name (autocomplete whitelist), test date, report number
- Result entry: structured fields per test type (dynamic — different fields for pesticide vs moisture vs physical)
- Upload certificate PDF
- Overall result: PASS / FAIL / CONDITIONAL radio buttons

**SCREEN 13 — New Shipment**

- Step 1 — Select Buyer: dropdown of existing buyers or "Add New Buyer"
- Step 2 — Shipment Details: invoice#, L/C#, port of loading, port of discharge, vessel name, shipment date
- Step 3 — Add Batches: search and add milling batches; enter weight from each; running total displayed
- Step 4 — Compliance Review: live compliance checklist populated as batches are added; score shown
- Step 5 — Review & Confirm

**SCREEN 14 — Shipment Detail**

- Compliance score prominently (large number, color-coded)
- Compliance checklist accordion: each item expandable to show which lots/farms failed/passed
- Batches table with lot traceability links
- Generate Certificate button (disabled if score < threshold)
- Shipment timeline: status progression bar

**SCREEN 15 — Buyer Portal (External, Magic Link)**

- Clean, minimal — mill logo + name at top
- Shipments assigned to this buyer: table with compliance badge
- Click shipment → full compliance summary + interactive map of farms
- Download Certificate button — prominent
- No navigation beyond what the buyer needs to see

## 8. Compliance Engine (EUDR + SPS)

## 8. Compliance Engine (EUDR + SPS)

### Overview

The compliance engine runs as a background service. It evaluates every shipment against a checklist of requirements and outputs a score from 0–100 and a ComplianceStatus enum. It is triggered on: shipment creation, batch added/removed from shipment, lab test result updated, EUDR risk updated on any contributing farm.

### EUDR Requirements (EU Deforestation Regulation)

| Requirement | How We Verify | Score Weight |
| --- | --- | --- |
| Farm GPS coordinates recorded | Farm.geoLat & geoLng not null | 20 pts |
| Farm deforestation risk is LOW | Farm.eudrRiskLevel = LOW | 25 pts |
| Commodity produced on non-deforested land | Auto-checked via Global Forest Watch API | (included above) |
| Operator due diligence statement | Shipment-level checkbox + timestamp | 10 pts |

**Global Forest Watch API Integration:**

```typescript
// services/eudr-check.service.ts
async function checkDeforestationRisk(lat: number, lng: number): Promise<EudrRisk> {
  // GFW Integrated Deforestation Alerts API
  const url = `https://data-api.globalforestwatch.org/dataset/gfw_integrated_alerts/latest/query`;
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      geometry: { type: 'Point', coordinates: [lng, lat] },
      buffer: 0.001  // ~100m buffer around the point
    })
  });
  const data = await response.json();
  if (data.data?.length > 0) return EudrRisk.HIGH;   // Alerts found
  // Check historical forest cover for pre-2020 baseline
  const coverCheck = await checkForestCover2020(lat, lng);
  return coverCheck ? EudrRisk.LOW : EudrRisk.MEDIUM;
}
```

### SPS Requirements (Sanitary & Phytosanitary)

| Requirement | How We Verify | Score Weight |
| --- | --- | --- |
| Pesticide residue test available for batch | LabTest of type PESTICIDE\_RESIDUE exists | 15 pts |
| Pesticide test result is PASS | LabTest.overallResult = PASS | 20 pts |
| Pesticide declaration for all lots | All lots linked to batches have ≥1 PesticideRecord or explicit "none" flag | 10 pts |
| Lab accredited (whitelist) | LabTest.labName in org's approved lab list | 5 pts |
| Test not expired (< 90 days old) | LabTest.testDate within 90 days of shipment date | 5 pts |

### Score Calculation Logic

```typescript
// services/compliance-score.service.ts

interface ComplianceCheckResult {
  score: number;            // 0-100
  status: ComplianceStatus;
  checks: CheckItem[];
}

interface CheckItem {
  id: string;
  category: 'EUDR' | 'SPS' | 'TRACEABILITY';
  label: string;
  passed: boolean;
  points: number;
  detail?: string;          // Explains failure: "Farm #3 missing GPS"
}

async function calculateComplianceScore(shipmentId: string): Promise<ComplianceCheckResult> {
  const shipment = await getShipmentWithFullChain(shipmentId);
  const checks: CheckItem[] = [];
  let score = 0;

  // Get all farms contributing to this shipment
  const farms = getAllFarmsForShipment(shipment);        // via batches → lots → farms
  const lots = getAllLotsForShipment(shipment);
  const batches = shipment.items.map(i => i.millingBatch);

  // ── TRACEABILITY CHECKS ──
  const allFarmsHaveGPS = farms.every(f => f.geoLat && f.geoLng);
  checks.push({
    id: 'gps_coverage', category: 'TRACEABILITY',
    label: 'All farms have GPS coordinates',
    passed: allFarmsHaveGPS, points: 20,
    detail: allFarmsHaveGPS ? null : `${farms.filter(f => !f.geoLat).length} farms missing GPS`
  });
  if (allFarmsHaveGPS) score += 20;

  // ── EUDR CHECKS ──
  const highRiskFarms = farms.filter(f => f.eudrRiskLevel === 'HIGH');
  const eudrPass = highRiskFarms.length === 0;
  checks.push({
    id: 'eudr_risk', category: 'EUDR',
    label: 'No high-risk deforestation farms',
    passed: eudrPass, points: 25,
    detail: eudrPass ? null : `${highRiskFarms.length} farms flagged HIGH risk`
  });
  if (eudrPass) score += 25;

  // ── SPS / LAB CHECKS ──
  const batchesWithPesticideTest = batches.filter(b =>
    b.labTests.some(t => t.testType === 'PESTICIDE_RESIDUE' && t.overallResult === 'PASS')
  );
  const labPass = batchesWithPesticideTest.length === batches.length;
  checks.push({
    id: 'lab_pesticide', category: 'SPS',
    label: 'All batches have passing pesticide test',
    passed: labPass, points: 35,
    detail: labPass ? null : `${batches.length - batchesWithPesticideTest.length} batches missing passing test`
  });
  if (labPass) score += 35;

  const lotsWithDeclaration = lots.filter(l => l.pesticidesUsed.length > 0 || l.noPesticidesFlag);
  const declPass = lotsWithDeclaration.length === lots.length;
  checks.push({
    id: 'pesticide_declaration', category: 'SPS',
    label: 'All lots have pesticide declaration',
    passed: declPass, points: 10,
    detail: declPass ? null : `${lots.length - lotsWithDeclaration.length} lots missing declaration`
  });
  if (declPass) score += 10;

  const dueDiligence = shipment.dueDiligenceConfirmed;
  checks.push({
    id: 'due_diligence', category: 'EUDR',
    label: 'Operator due diligence statement confirmed',
    passed: !!dueDiligence, points: 10
  });
  if (dueDiligence) score += 10;

  // Determine status
  let status: ComplianceStatus;
  if (score === 100) status = 'COMPLIANT';
  else if (score >= 60 && !highRiskFarms.length && labPass) status = 'COMPLIANT';  // Partial OK
  else if (highRiskFarms.length > 0 || !labPass) status = 'AT_RISK';
  else status = 'INCOMPLETE';

  // Persist to DB
  await updateShipmentCompliance(shipmentId, score, status);
  return { score, status, checks };
}
```

### EUDR Due Diligence Statement Template

The system auto-populates this from shipment data. The export manager reviews and confirms it within the system.

```
Due Diligence Statement — EUDR Article 4
Operator: [Mill Name], [Address], Pakistan
Commodity: Rice (HS 1006)
Country of Production: Pakistan
We declare that the commodity described in shipment [SHP-XXXX] was not produced on land
that was subject to deforestation or forest degradation after December 31, 2020.
This statement is supported by GPS-referenced farm records for [N] farms across
[districts] districts, verified against Global Forest Watch deforestation alert data
as of [date].
Confirmed by: [Name], [Role] — [Date]
```

## 9. Document Generation System

## 9. Document Generation System

### Certificate PDF Architecture

Certificates are generated server-side as PDFs via a BullMQ background job. The generation flow:

1. Export Manager clicks "Generate Certificate" → POST `/shipments/:id/certificate`
2. API validates compliance score ≥ threshold, enqueues `generate-certificate` job in BullMQ
3. Worker picks up job → fetches full shipment data with traceability chain → renders PDF
4. PDF uploaded to S3 → URL stored in `shipment.certificateUrl` → WebSocket event notifies frontend
5. Frontend shows download button

### Certificate Contents (Page 1 — Summary)

```
┌──────────────────────────────────────────────────────────────────┐
│  [MILL LOGO]    RICE TRACEABILITY CERTIFICATE                    │
│                 Certificate No: CERT-2024-0042                   │
│                 Issue Date: November 15, 2024                    │
├──────────────────────────────────────────────────────────────────┤
│  EXPORTER DETAILS              │  BUYER DETAILS                  │
│  [Mill Name]                   │  [Buyer Company]                │
│  [Address], Pakistan           │  [Country]                      │
│  PREA License: XXXX            │  Contact: [Name]                │
├──────────────────────────────────────────────────────────────────┤
│  SHIPMENT DETAILS                                                │
│  Shipment No: SHP-2024-0021    Invoice No: INV-2024-0055         │
│  Variety: Basmati 1121         Weight: 25,000 kg                 │
│  Port of Loading: Port Qasim   Port of Discharge: Rotterdam      │
│  L/C Number: XXXX              Vessel: [Vessel Name]             │
├──────────────────────────────────────────────────────────────────┤
│  COMPLIANCE STATUS: ✅ COMPLIANT  │  Score: 95/100               │
│                                                                  │
│  ✅ Farm GPS Recorded (12/12 farms)                              │
│  ✅ EUDR Deforestation Risk: LOW (all farms)                     │
│  ✅ Pesticide Residue Test: PASS (SGS Lab, Nov 10, 2024)         │
│  ✅ Pesticide Declarations: Complete (all lots)                  │
│  ✅ Due Diligence Statement: Confirmed                           │
└──────────────────────────────────────────────────────────────────┘
```

### Certificate Contents (Page 2 — Traceability Chain)

```
  MILLING BATCHES
  ┌──────────────┬─────────────┬───────────────┬────────────┐
  │ Batch No     │ Weight (kg) │ Milling Date  │ Mill       │
  │ BATCH-2024.. │ 15,000      │ Oct 25, 2024  │ Main Mill  │
  │ BATCH-2024.. │ 10,000      │ Oct 28, 2024  │ Main Mill  │
  └──────────────┴─────────────┴───────────────┴────────────┘

  PROCUREMENT LOTS (source paddy)
  ┌───────────┬─────────────┬──────────────┬─────────────┬──────────────┐
  │ Lot No    │ Farmer Name │ District     │ Weight (kg) │ EUDR Risk    │
  │ LOT-...   │ M. Ibrahim  │ Sheikhupura  │ 5,200       │ ✅ LOW       │
  │ LOT-...   │ A. Rasheed  │ Gujranwala   │ 4,800       │ ✅ LOW       │
  │ ... (12 total lots)                                                  │
  └───────────┴─────────────┴──────────────┴─────────────┴──────────────┘

  FARM GPS COORDINATES
  ┌─────────────────┬────────────────┬───────────────┬─────────────┐
  │ Farm             │ Latitude       │ Longitude     │ EUDR Status │
  │ Ibrahim Farm 1   │ 31.7167°N      │ 73.9850°E     │ ✅ LOW      │
  │ Rasheed Farm     │ 32.1553°N      │ 74.1872°E     │ ✅ LOW      │
  └─────────────────┴────────────────┴───────────────┴─────────────┘
```

### Certificate Contents (Page 3 — Lab Tests)

```
  QUALITY CERTIFICATIONS
  ┌────────────────────┬────────────────┬────────────┬────────┬────────┐
  │ Test Type          │ Lab            │ Date       │ Cert # │ Result │
  │ Pesticide Residue  │ SGS Pakistan   │ 2024-11-10 │ SGS-.. │ ✅ PASS│
  │ Physical Inspection│ In-house       │ 2024-10-30 │ —      │ ✅ PASS│
  └────────────────────┴────────────────┴────────────┴────────┴────────┘

  EUDR DUE DILIGENCE STATEMENT
  [Full text of due diligence statement with operator signature block]

  QR CODE: [Links to digital verification URL on buyer portal]
```

### PDF Technical Implementation

```typescript
// workers/generate-certificate.worker.ts
import puppeteer from 'puppeteer';

async function generateCertificatePDF(shipmentId: string): Promise<string> {
  const data = await getFullShipmentData(shipmentId);
  
  // Render HTML template with data
  const html = renderCertificateHTML(data);  // Handlebars/JSX template
  
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
  });
  
  await browser.close();
  
  // Upload to S3
  const key = `certificates/${shipmentId}/CERT-${shipmentId}.pdf`;
  const url = await uploadToS3(pdf, key, 'application/pdf');
  
  // Update shipment record
  await prisma.shipment.update({
    where: { id: shipmentId },
    data: { certificateUrl: url, certificateGeneratedAt: new Date() }
  });
  
  return url;
}
```

### Digital Verification (QR Code)

- Each certificate has a QR code linking to: `https://app.ricetrace.pk/verify/CERT-2024-0042`
- This URL loads a public (no login needed) verification page showing:
  - Certificate authenticity status (valid / revoked)
  - Issue date, shipment number, mill name
  - Compliance score and status
  - Does NOT show sensitive farmer data — only high-level compliance info
- This gives buyers a way to verify the certificate is genuinely from RiceTrace, not a forged PDF

### Buyer Portal Implementation Details

- Magic link format: `https://app.ricetrace.pk/buyer/tk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Token: 32-char crypto-random string, stored hashed in DB
- Token expiry: 90 days, renewable by Export Manager
- On first access: welcome screen with mill logo + instructions
- Sessions: token IS the session — no additional JWT needed
- Rate limiting: max 100 requests/day per token (Redis counter)

## 10. Phased Build Roadmap

## 10. Phased Build Roadmap

### Phase 1 — Core MVP (Weeks 1–6)

**Goal:** A working system where a mill can register farmers, enter lots, create batches, log lab tests, and generate a basic traceability certificate.

**Week 1 — Project Setup & Auth**

- [ ] Initialize monorepo with Turborepo, Next.js, Express, Prisma
- [ ] Configure PostgreSQL on Supabase + Redis on Upstash
- [ ] Run all Prisma migrations (full schema from Section 4)
- [ ] Implement JWT auth: login, refresh token, logout, /auth/me
- [ ] Implement role-based middleware (UserRole enum → route guards)
- [ ] Build org + user management API (CRUD for Organization, User, Mill)
- [ ] Build Next.js login screen and auth context
- [ ] Set up S3 bucket (or Cloudflare R2) for file storage

**Week 2 — Farmer & Farm Registry**

- [ ] Farmer CRUD API endpoints (all /farmers routes from Section 6)
- [ ] Farm CRUD API endpoints
- [ ] EUDR check service: Global Forest Watch API integration (EudrRisk logic)
- [ ] Background job: auto-trigger EUDR check on farm creation via BullMQ
- [ ] Frontend: Farmer List screen (Table, search, filter by district)
- [ ] Frontend: Add Farmer form (3-step wizard, CNIC validation)
- [ ] Frontend: Farmer Profile page (farms tab, history tab)
- [ ] Frontend: Add Farm form (GPS capture, map preview with Leaflet)
- [ ] CNIC photo upload (Multer → S3)

**Week 3 — Procurement Lot Entry**

- [ ] ProcurementLot CRUD API (all /lots routes)
- [ ] PesticideRecord + FertilizerRecord sub-APIs
- [ ] Auto lot number generation service
- [ ] Photo upload for lots (Multer multi-file → S3)
- [ ] Frontend: Lot List screen (desktop)
- [ ] Frontend: Lot Detail screen (traceability chain display)
- [ ] Frontend: New Lot Entry — MOBILE-FIRST multi-step form (Screens 7 detail from Section 7)
- [ ] PWA setup: manifest.json, service worker via Workbox, install prompt
- [ ] Offline support: IndexedDB via Dexie.js for lot form data, sync queue, sync status badge

**Week 4 — Milling Batches & Lab Tests**

- [ ] MillingBatch CRUD API (all /batches routes)
- [ ] BatchLotLink API (link/unlink lots to batches with weight tracking)
- [ ] Milling yield auto-calculation on batch update
- [ ] LabTest CRUD API (all /lab-tests routes)
- [ ] Lab certificate PDF upload endpoint
- [ ] Frontend: Batch List + Batch Detail screens
- [ ] Frontend: New Milling Batch form (with lot linking UI — search + add lots)
- [ ] Frontend: Batch traceability view (farm map with Leaflet, compliance summary)
- [ ] Frontend: Lab Test form + certificate upload
- [ ] Batch compliance indicator (green/yellow/red)

**Week 5 — Buyers, Shipments & Compliance Engine**

- [ ] Buyer CRUD API
- [ ] Magic link generation: crypto.randomBytes(32), hash storage, URL generation
- [ ] Magic link email via Nodemailer/SES
- [ ] Shipment CRUD API (all /shipments routes)
- [ ] ShipmentItem API (add/remove batches)
- [ ] Compliance score service (full calculateComplianceScore() from Section 8)
- [ ] BullMQ job: recalculate compliance when any dependency changes
- [ ] Frontend: Buyer management screen
- [ ] Frontend: New Shipment multi-step form (Screen 13 from Section 7)
- [ ] Frontend: Shipment Detail with compliance checklist accordion (Screen 14)

**Week 6 — Certificate Generation, Buyer Portal & Polish**

- [ ] Puppeteer PDF generation worker (full certificate layout from Section 9)
- [ ] Certificate HTML template (all 3 pages)
- [ ] QR code generation (qrcode npm package) → embed in certificate → digital verify page
- [ ] Buyer portal routes: /buyer-portal/:token/\* (all endpoints from Section 6)
- [ ] Frontend: Buyer Portal pages (shipment list, shipment detail with map, certificate download)
- [ ] Dashboard screen: stat cards, charts (Recharts), quick actions
- [ ] WebSocket or polling for certificate generation status notification
- [ ] Language toggle (Urdu/English) via next-intl — translate all field labels in the procurement flow
- [ ] End-to-end testing: create farmer → farm → lot → batch → lab test → shipment → certificate

---

### Phase 2 — Robustness (Weeks 7–10)

**Analytics & Reporting**

- [ ] Dashboard analytics API endpoints (/dashboard/\*)
- [ ] Procurement volume charts (by district, variety, officer, week)
- [ ] Season comparison (current vs prior season)
- [ ] Export reports to Excel (xlsx npm package): lot register, batch register, compliance report

**Data Quality & Validation**

- [ ] Bulk farmer import from Excel template (Multer + xlsx parsing)
- [ ] Duplicate CNIC detection across org
- [ ] Bulk lot import from Excel (for mills that have prior season data in spreadsheets)
- [ ] Data completeness alerts: email digest to Mill Admin (weekly) listing lots with missing GPS, batches with no lab test, farms with pending EUDR check

**Multi-Mill Support**

- [ ] Mill selector in all list screens for Enterprise orgs
- [ ] Cross-mill analytics (total org view)
- [ ] Mill-specific user restrictions (user tied to one mill)

**Security & Production Hardening**

- [ ] Rate limiting (express-rate-limit on all auth routes)
- [ ] Input sanitization (DOMPurify server-side equivalent)
- [ ] API request logging (Morgan → structured logs)
- [ ] S3 file type validation server-side (file-type package)
- [ ] Signed S3 URLs (time-limited access, not public URLs)
- [ ] Subscription gating: middleware checks org.plan before allowing premium features

---

### Phase 3 — Growth (Weeks 11–16)

**Subscription & Billing**

- [ ] Plan management in org settings
- [ ] Feature flags per plan (buyer portal = PROFESSIONAL+, multi-mill = ENTERPRISE)
- [ ] Manual invoice generation (PDF) for Pakistani billing context

**WeBOC / Customs Integration**

- [ ] Read GD (Goods Declaration) number from WeBOC via their API or scraper
- [ ] Link GD number to shipment record
- [ ] Pull export stats from WeBOC

**API Access for Enterprise**

- [ ] API key management (generate, revoke keys)
- [ ] Documented REST API with rate limits for Enterprise orgs to push data from their own systems
- [ ] Webhook support: notify customer systems when compliance score changes, certificate generated

**Localization & Field Optimization**

- [ ] Full Urdu UI translation (not just procurement flow)
- [ ] Urdu PDF certificate variant
- [ ] SMS alerts via Jazz/Telenor API: notify procurement officer when lot is synced

---

### AI Agent — Build Instructions Summary

Give this entire document to the AI agent with the following system instruction:

```
You are a senior full-stack engineer. Your task is to build RiceTrace, a B2B SaaS application,
exactly as specified in this document. Follow these rules:

1. Start with Phase 1, Week 1 and complete tasks in order.
2. Use the EXACT Prisma schema from Section 4 — do not modify field names.
3. All API endpoints must follow the exact paths and patterns in Section 6.
4. Error and success response shapes must match Section 6 standards exactly.
5. For the compliance score calculation, implement the exact logic from Section 8.
6. The mobile lot entry flow (Screen 7) is the highest-priority UI screen — make it
   pixel-perfect for mobile, large tap targets, minimal typing, offline-capable.
7. Write TypeScript throughout — no untyped JavaScript.
8. Every new file must have a comment at the top describing its purpose.
9. When complete with each week's tasks, output a checklist confirming each item.
10. Ask for clarification ONLY if a requirement is genuinely ambiguous — otherwise proceed.
```
