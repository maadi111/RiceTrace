# 🌾 RiceTrace — Farm-to-Shipment Traceability & EUDR Compliance SaaS

<p align="center">
  <img src="./test-images/02_dashboard_kpis_and_metrics.png" alt="RiceTrace Executive Dashboard" width="95%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);" />
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js_14-App_Router-black?style=for-the-badge&logo=next.js" alt="Next.js" /></a>
  <a href="https://expressjs.com"><img src="https://img.shields.io/badge/Express.js-5.x_TypeScript-000000?style=for-the-badge&logo=express" alt="Express" /></a>
  <a href="https://www.prisma.io"><img src="https://img.shields.io/badge/Prisma-5.22_ORM-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" /></a>
  <a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/PostgreSQL-16_JSONB-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL" /></a>
  <a href="https://turbo.build"><img src="https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=for-the-badge&logo=turborepo" alt="Turborepo" /></a>
  <a href="https://commission.europa.eu/energy-climate-change-environment/standards-tools-and-labels/eu-deforestation-regulation_en"><img src="https://img.shields.io/badge/EUDR_2023%2F1115-Compliant-10B981?style=for-the-badge" alt="EUDR Compliant" /></a>
  <img src="https://img.shields.io/badge/License-All_Rights_Reserved-red?style=for-the-badge" alt="All Rights Reserved" />
</p>

---

## 📌 Executive Overview

**RiceTrace** is an enterprise-grade B2B SaaS platform engineered specifically for rice export mills, agricultural cooperatives, quality compliance officers, and overseas importers. It delivers uncompromising **farm-to-shipment physical traceability**, automated **EUDR (EU Deforestation Regulation 2023/1115)** compliance certification, cadastral plot geolocation screening, and verifiable chain-of-custody ledgers.

Under EUDR 2023/1115, any rice container imported into the European Union must prove it originates from land **not deforested after December 31, 2020**, with exact polygon and GPS coordinates down to the individual farmer plot. RiceTrace unifies Pakistan and South Asia's traditional rice basins (Muridke, Sheikhupura, Hafizabad, Gujranwala) with international customs authorities and global retail buyers.

---

## 📸 Visual Showcase & Platform Tour

### 1. Executive Analytics & Operational Dashboard
Real-time KPI metrics, active milling queues, warehouse intake volumes, and EUDR compliance radars.
<p align="center">
  <img src="./test-images/02_dashboard_kpis_and_metrics.png" alt="Executive Dashboard" width="90%" />
</p>

---

### 2. Cadastral Farm Geolocation & EUDR Satellite Screening
Interactive Leaflet/OpenStreetMap mapping showing registered farm boundaries, GPS centroid polygons, and zero-deforestation compliance ratings.
<p align="center">
  <img src="./test-images/06_farm_cadastral_mapping.png" alt="Cadastral Farm Mapping" width="90%" />
</p>

---

### 3. Mobile Lot Intake Wizard (Offline-Ready)
Streamlined 4-step wizard for field procurement officers to record paddy intake, bag counts, moisture percentages (12.5% MRL standard), and Good Agricultural Practice (GAP) pesticide declarations.
<p align="center">
  <img src="./test-images/08_mobile_lot_wizard_step1_farmer.png" alt="Mobile Lot Wizard" width="45%" />
  <img src="./test-images/10_mobile_lot_wizard_step3_quality_moisture.png" alt="Moisture Quality Verification" width="45%" />
</p>

---

### 4. Quality Control & ISO-17025 Lab Test Verification
Multi-residue pesticide MRL (Tricyclazole, Chlorpyrifos) and Aflatoxin B1 validation dashboard with instant Pass/Fail safety thresholds.
<p align="center">
  <img src="./test-images/13_quality_lab_tests_overview.png" alt="Quality & Lab Testing" width="90%" />
</p>

---

### 5. Export Consignment & Compliance Due Diligence
Container allocation, vessel tracking (MSC, Maersk, Hapag-Lloyd), and automated Due Diligence Statement calculations (0–100 scoring engine).
<p align="center">
  <img src="./test-images/15_shipments_tracking_overview.png" alt="Shipment Tracking" width="90%" />
</p>

---

### 6. Public Cryptographic QR Verification Portal (`/verify/[certNumber]`)
Zero-login public ledger for European customs inspectors and overseas retail buyers to verify official 3-page traceability certificates with cryptographic tamper-evident seals.
<p align="center">
  <img src="./test-images/16_eudr_certificate_verification_portal.png" alt="Public Verification Portal" width="90%" />
</p>

---

### 7. International Buyer Consignment Portal (`/buyer/[token]`)
Secure magic-link portal for international buyers (e.g. EuroCommodities B.V.) featuring shipment delivery timelines, farm origin maps, and 1-click certificate PDF downloads.
<p align="center">
  <img src="./test-images/17_buyer_consignment_portal.png" alt="Buyer Portal" width="90%" />
</p>

---

## 🏛 Core Architectural Pillars

```mermaid
flowchart LR
    A[🌾 Farmer Plots<br/>Cadastral GPS Polygons] --> B[📦 Procurement Lots<br/>Moisture & GAP Declarations]
    B --> C[🏭 Milling Batches<br/>Paddy to Head Rice Yield]
    C --> D[🧪 Lab Tests<br/>ISO-17025 MRL & Aflatoxin]
    D --> E[🚢 Export Shipments<br/>100% EUDR Scoring Engine]
    E --> F[📜 EUDR PDF Certificate<br/>Cryptographic SHA-256 Seal]
    F --> G[🌐 Public Verification & Buyer Portal<br/>Tamper-Evident QR Access]
```

### 1. Complete Physical Chain-of-Custody
Every grain of rice in an export shipment traces backward through an unbroken lineage:
`Shipment` $\rightarrow$ `ShipmentItem` $\rightarrow$ `MillingBatch` $\rightarrow$ `BatchLotLink` $\rightarrow$ `ProcurementLot` $\rightarrow$ `Farm` $\rightarrow$ `Farmer`.

### 2. Multi-Tenant Mill Security & RBAC
- Enterprise organization isolation ensuring strict tenancy boundaries.
- Dedicated user personas:
  - **Mill Admin:** Complete operational oversight, NTN tax profile, and billing settings.
  - **Procurement Officer:** Mobile lot intake wizard, weighing scales, and moisture sampling.
  - **Quality Controller:** Lab test report uploading and MRL threshold verification.
  - **Export Manager:** Buyer consignments, due diligence declarations, and certificate issuance.

### 3. Automated EUDR 2023/1115 Compliance Engine
- **GPS Coverage Verification (+20 pts):** Requires valid latitude/longitude for 100% of contributing farms.
- **Deforestation Baseline (+25 pts):** Validates plots against post-2020 forest clearance cutoff dates.
- **MRL Residue Validation (+35 pts):** Verifies passing ISO-17025 pesticide residue testing.
- **Farmer Pesticide Declaration (+10 pts):** Confirms recorded active ingredients and harvest withholding intervals.
- **Operator Due Diligence (+10 pts):** Export Director legal statement confirmation.

### 4. Bilingual International Interface (`EN | UR`)
Full bilingual support (**English** and **اردو - Urdu**) with live RTL layout adjustment to guarantee effortless field adoption across rural Pakistan and Punjab procurement yards.

---

## 📂 Repository Structure

The project is structured as an enterprise **Turborepo** monorepo using npm workspaces:

```
RiceTrace/
├── apps/
│   ├── web/                    # Next.js 14 App Router Frontend
│   │   ├── src/app/            # App routes (/dashboard, /farmers, /lots, /milling, /shipments, /verify, /buyer)
│   │   ├── src/components/     # Design system (Cards, Modals, Maps, Weather, Clocks, Language switchers)
│   │   └── src/lib/            # Client sync, offline indexedDB storage, auth state
│   └── api/                    # Express.js REST API Backend
│       ├── src/controllers/    # Route controllers (Auth, Farmers, Lots, Batches, Shipments, Buyer Portal)
│       ├── src/services/       # Compliance scoring, BullMQ queue, PDF certificate generation
│       ├── src/middleware/     # JWT authentication, RBAC authorization, Zod schema validation
│       └── src/workers/        # Background certificate and satellite workers
├── packages/
│   ├── db/                     # Prisma schema, client singleton, and database seeds
│   ├── types/                  # Shared TypeScript interfaces and DTOs
│   ├── validators/             # Shared Zod validation schemas
│   └── pdf-templates/          # High-fidelity 3-page EUDR PDF Certificate templates
├── test-images/                # 18 Full-resolution end-to-end visual test screenshots
│   ├── TEST_EXECUTION_REPORT.md# Complete test audit and database verification log
│   └── test-report.json        # Machine-readable test execution report
├── scripts/                    # Automation and test harnesses (CDP headless browser testing)
├── turbo.json                  # Turborepo task pipeline definitions
├── LICENSE                     # Proprietary All Rights Reserved License
└── package.json                # Root workspace configuration
```

---

## ⚡ Technology Stack

| Domain | Technology | Details |
|---|---|---|
| **Frontend Framework** | **Next.js 14** | React 18, App Router, Server Components, SSR hydration safety |
| **Styling & Design System** | **Tailwind CSS & Lucide** | Curated Charcoal (`#0f172a`) & Emerald (`#10b981`) color tokens |
| **Interactive Maps** | **Leaflet & OpenStreetMap** | Cadastral parcel visualization and boundary inspection |
| **Backend API** | **Express.js & TypeScript** | RESTful modular architecture, Zod request validation, JWT auth |
| **Database & ORM** | **PostgreSQL 16 & Prisma ORM** | JSONB cadastral storage, sequences, relational constraints |
| **Background Jobs** | **BullMQ & Redis 7** | Asynchronous PDF generation, EUDR satellite screening workers |
| **PDF Generation** | **Puppeteer & QRCode** | High-resolution 3-page official traceability certificates with QR seals |
| **Build System** | **Turborepo** | Caching, parallel workspace tasks, zero-overhead pipeline |

---

## 🛠 Local Setup & Installation

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Docker & Docker Compose**: Required for PostgreSQL and Redis services
- **Google Chrome**: For local PDF generation and CDP visual verification

### 1. Clone Repository
```bash
git clone https://github.com/maadi111/RiceTrace.git
cd RiceTrace
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Database & Redis (Docker)
```bash
docker run -d --name ricetrace-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ricetrace postgres:16-alpine
docker run -d --name ricetrace-redis -p 6379:6379 redis:7-alpine
```

### 4. Environment Variables
Create an `.env` file in `apps/api/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/ricetrace?schema=public"
JWT_ACCESS_SECRET="your-super-secret-jwt-access-token-key"
JWT_REFRESH_SECRET="your-super-secret-jwt-refresh-token-key"
PORT=4000
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"
STORAGE_DRIVER="local"
LOCAL_UPLOAD_DIR="./uploads"
APP_URL="http://localhost:3000"
API_URL="http://localhost:4000"
```

### 5. Run Database Migrations & Seeds
```bash
npm run db:push --workspace=@ricetrace/db
npm run db:generate --workspace=@ricetrace/db
npm run db:seed --workspace=@ricetrace/db
```

### 6. Start Development Servers
```bash
npm run dev
```
- **Web Application:** `http://localhost:3000`
- **REST API:** `http://localhost:4000`

---

## 🧪 Comprehensive Test Suite & Visual Verification

RiceTrace includes an automated end-to-end testing harness that exercises every module using headless Chrome via the native Chrome DevTools Protocol (CDP), injects real authentication tokens, creates live database records, and validates database persistence.

To execute the test suite:
```bash
npx tsx scripts/run-complete-test-suite.ts
```

All 18 high-resolution screenshots are automatically rendered into [`test-images/`](./test-images) and detailed in [`test-images/TEST_EXECUTION_REPORT.md`](./test-images/TEST_EXECUTION_REPORT.md).

---

## 📄 License

**Copyright © 2026 RiceTrace. All Rights Reserved.**

This software and associated documentation files are proprietary and confidential. Unauthorized copying, distribution, modification, reverse engineering, or commercial exploitation is strictly prohibited without prior written consent. See the [LICENSE](./LICENSE) file for complete terms.
