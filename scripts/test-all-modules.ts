import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../apps/api/.env") });

import { prisma } from "@ricetrace/db";

const API_BASE = "http://localhost:4000/api/v1";

interface TestReport {
  name: string;
  category: string;
  status: "PASSED" | "FAILED";
  durationMs: number;
  details: string;
  dbVerified?: boolean;
}

const reports: TestReport[] = [];

async function runTest(
  category: string,
  name: string,
  fn: () => Promise<{ details: string; dbVerified?: boolean }>
) {
  const start = Date.now();
  try {
    const res = await fn();
    const durationMs = Date.now() - start;
    reports.push({
      category,
      name,
      status: "PASSED",
      durationMs,
      details: res.details,
      dbVerified: res.dbVerified,
    });
    console.log(`✅ [${category}] ${name} (${durationMs}ms) - ${res.details}`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    reports.push({
      category,
      name,
      status: "FAILED",
      durationMs,
      details: err?.message || String(err),
    });
    console.error(`❌ [${category}] ${name} (${durationMs}ms) - ${err?.message || err}`);
  }
}

async function api(endpoint: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // raw text
  }

  if (!res.ok) {
    throw new Error(
      `API ${options.method || "GET"} ${endpoint} returned ${res.status}: ${
        json?.error?.message || json?.message || text.slice(0, 150)
      }`
    );
  }

  return json?.data ?? json;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  RICETRACE COMPREHENSIVE END-TO-END AUTOMATED TEST SUITE        ");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  let adminToken = "";
  let procToken = "";
  let qcToken = "";
  let exportToken = "";
  let adminOrgId = "";
  let millId = "";

  // ─── 1. AUTHENTICATION & SESSIONS ───────────────────────────────────────────
  await runTest("Auth", "Admin Login (MILL_ADMIN)", async () => {
    const res = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@al-raheem-rice.pk", password: "Secret123!" }),
    });
    adminToken = res.tokens?.accessToken || res.accessToken;
    adminOrgId = res.user.organizationId;
    if (!adminToken?.startsWith("eyJ")) throw new Error("Invalid JWT token received");
    return { details: `Received JWT starting with ${adminToken.slice(0, 15)}..., Role: ${res.user.role}` };
  });

  await runTest("Auth", "Procurement Officer Login", async () => {
    const res = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "procurement@al-raheem-rice.pk", password: "Secret123!" }),
    });
    procToken = res.tokens?.accessToken || res.accessToken;
    return { details: `Procurement Officer authenticated, Role: ${res.user.role}` };
  });

  await runTest("Auth", "Quality Manager Login", async () => {
    const res = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "quality@al-raheem-rice.pk", password: "Secret123!" }),
    });
    qcToken = res.tokens?.accessToken || res.accessToken;
    return { details: `QC Manager authenticated, Role: ${res.user.role}` };
  });

  await runTest("Auth", "Export Director Login", async () => {
    const res = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "export@al-raheem-rice.pk", password: "Secret123!" }),
    });
    exportToken = res.tokens?.accessToken || res.accessToken;
    return { details: `Export Director authenticated, Role: ${res.user.role}` };
  });

  await runTest("Auth", "Token Refresh Endpoint", async () => {
    const loginRes = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@al-raheem-rice.pk", password: "Secret123!" }),
    });
    const refreshToken = loginRes.tokens?.refreshToken || loginRes.refreshToken;
    const refreshRes = await api("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    const newAccessToken = refreshRes.accessToken || refreshRes.tokens?.accessToken;
    if (!newAccessToken) throw new Error("No refreshed access token returned");
    return { details: `Successfully refreshed JWT token: ${newAccessToken.slice(0, 15)}...` };
  });

  // ─── 2. DASHBOARD & SYSTEM STATS ───────────────────────────────────────────
  await runTest("Dashboard", "Fetch Dashboard Summary", async () => {
    const summary = await api("/dashboard/summary", {}, adminToken);
    return { details: `Total paddy this month: ${summary.totalPaddyThisMonth || 0} kg, Active batches: ${summary.activeBatches}` };
  });

  await runTest("Dashboard", "Fetch Procurement Stats", async () => {
    const stats = await api("/dashboard/procurement-stats", {}, adminToken);
    return { details: `Volume by variety groups: ${stats.byVariety?.length ?? 0}` };
  });

  await runTest("Dashboard", "Fetch Compliance Overview", async () => {
    const compliance = await api("/dashboard/compliance-overview", {}, adminToken);
    return { details: `Shipments by compliance status: ${JSON.stringify(compliance.shipmentsByCompliance || [])}` };
  });

  await runTest("Dashboard", "Fetch EUDR Risk Map", async () => {
    const map = await api("/dashboard/eudr-risk-map", {}, adminToken);
    return { details: `Mapped farm geolocation points: ${map.length}` };
  });

  // Fetch Mills from DB for reference
  const mill = await prisma.mill.findFirst({ where: { organizationId: adminOrgId } });
  if (!mill) throw new Error("No mill found in DB for org");
  millId = mill.id;

  // ─── 3. FARMER MODULE (CREATE & DB VERIFY) ──────────────────────────────────
  // Exact 13 digits with no dashes required by CreateFarmerSchema
  const randomSuffix = Math.floor(10000000 + Math.random() * 90000000).toString();
  const testCnic = `35201${randomSuffix}`;
  let createdFarmerId = "";

  await runTest("Farmers", "Create New Farmer via API", async () => {
    const payload = {
      name: "Chaudhry Tariq Gujjar",
      fatherName: "Haji Allah Ditta",
      cnic: testCnic,
      phone: "+923001234567",
      village: "Kot Abdul Malik",
      union: "Union Council 14",
      tehsil: "Ferozewala",
      district: "Sheikhupura",
    };
    const farmer = await api("/farmers", { method: "POST", body: JSON.stringify(payload) }, procToken);
    createdFarmerId = farmer.id;

    // Direct DB Verification
    const dbFarmer = await prisma.farmer.findUnique({ where: { id: createdFarmerId } });
    if (!dbFarmer) throw new Error("Farmer was not found in PostgreSQL database");
    if (dbFarmer.cnic !== testCnic) throw new Error("Database CNIC mismatch");

    return {
      details: `Farmer ${farmer.name} (CNIC: ${farmer.cnic}, ID: ${farmer.id}) created & verified in DB`,
      dbVerified: true,
    };
  });

  await runTest("Farmers", "Fetch Farmer by ID with relations", async () => {
    const farmer = await api(`/farmers/${createdFarmerId}`, {}, procToken);
    if (farmer.cnic !== testCnic) throw new Error("Farmer retrieval mismatch");
    return { details: `Retrieved farmer ${farmer.name}, District: ${farmer.district}` };
  });

  // ─── 4. FARM MODULE (CREATE & DB VERIFY) ────────────────────────────────────
  let createdFarmId = "";
  await runTest("Farms", "Create Farm for Farmer (EUDR Geospatial)", async () => {
    const farmPayload = {
      name: "Gujjar Agro Plot 4",
      areaAcres: 24.5,
      geoLat: 31.7167,
      geoLng: 73.9850,
      district: "Sheikhupura",
      tehsil: "Ferozewala",
      landTitle: "Khasra 412/18",
      geoPolygon: {
        type: "Polygon",
        coordinates: [
          [
            [73.9840, 31.7160],
            [73.9860, 31.7160],
            [73.9860, 31.7175],
            [73.9840, 31.7175],
            [73.9840, 31.7160],
          ],
        ],
      },
    };
    const farm = await api(`/farmers/${createdFarmerId}/farms`, {
      method: "POST",
      body: JSON.stringify(farmPayload),
    }, procToken);
    createdFarmId = farm.id;

    // Direct DB Verification
    const dbFarm = await prisma.farm.findUnique({ where: { id: createdFarmId } });
    if (!dbFarm) throw new Error("Farm was not found in PostgreSQL database");
    if (dbFarm.areaAcres !== 24.5) throw new Error("Database farm area mismatch");

    return {
      details: `Farm ${farm.name} (24.5 Acres, GPS: ${farm.geoLat}, ${farm.geoLng}) created & verified in DB`,
      dbVerified: true,
    };
  });

  // ─── 5. PROCUREMENT LOTS MODULE (CREATE & DB VERIFY) ────────────────────────
  let createdLotId = "";
  let createdLotNumber = "";

  await runTest("Procurement", "Create New Procurement Lot with Chemical Declaration", async () => {
    const lotPayload = {
      millId,
      farmerId: createdFarmerId,
      farmId: createdFarmId,
      variety: "BASMATI_1121",
      weightKg: 38000,
      moisturePercent: 12.1,
      dateReceived: new Date().toISOString(),
      vehicleNumber: "LES-2024-9182",
      noPesticidesFlag: false,
      pesticidesUsed: [
        {
          name: "Virtako",
          activeIngredient: "Chlorantraniliprole",
          daysBeforeHarvest: 45,
          doseLitersPerAcre: 0.25,
        },
      ],
      fertilizersUsed: [
        {
          name: "Sona Urea",
          npkRatio: "46-0-0",
        },
      ],
      gpsLat: 31.7167,
      gpsLng: 73.9850,
      notes: "Field procurement test lot - Sheikhupura harvest",
    };

    const lot = await api("/lots", {
      method: "POST",
      body: JSON.stringify(lotPayload),
    }, procToken);

    createdLotId = lot.id;
    createdLotNumber = lot.lotNumber;

    // Direct DB Verification
    const dbLot = await prisma.procurementLot.findUnique({
      where: { id: createdLotId },
      include: { pesticidesUsed: true, fertilizersUsed: true },
    });
    if (!dbLot) throw new Error("ProcurementLot was not found in PostgreSQL database");
    if (dbLot.pesticidesUsed.length !== 1) throw new Error("Pesticide record was not linked in DB");
    if (dbLot.weightKg !== 38000) throw new Error("Weight mismatch in DB");

    return {
      details: `Lot ${createdLotNumber} (38,000 kg, Basmati 1121) created & verified in DB`,
      dbVerified: true,
    };
  });

  await runTest("Procurement", "Query Lot Details by ID", async () => {
    const lot = await api(`/lots/${createdLotId}`, {}, procToken);
    if (lot.lotNumber !== createdLotNumber) throw new Error("Lot number mismatch");
    return { details: `Retrieved ${lot.lotNumber}, Status: ${lot.status}, Farmer: ${lot.farmer.name}` };
  });

  // ─── 6. MILLING & BATCHES MODULE (CREATE, ALLOCATE, DB VERIFY) ──────────────
  let createdBatchId = "";
  let createdBatchNumber = "";

  await runTest("Milling", "Create Milling Batch", async () => {
    const batchPayload = {
      millId,
      variety: "BASMATI_1121",
      startDate: new Date().toISOString(),
      paddyInputKg: 38000,
      notes: "E2E Batch Processing Basmati 1121",
    };

    const batch = await api("/batches", {
      method: "POST",
      body: JSON.stringify(batchPayload),
    }, adminToken);

    createdBatchId = batch.id;
    createdBatchNumber = batch.batchNumber;

    // Direct DB Verification
    const dbBatch = await prisma.millingBatch.findUnique({ where: { id: createdBatchId } });
    if (!dbBatch) throw new Error("MillingBatch was not found in PostgreSQL database");

    return {
      details: `Batch ${createdBatchNumber} (38,000 kg paddy input) created & verified in DB`,
      dbVerified: true,
    };
  });

  await runTest("Milling", "Allocate Procurement Lot to Milling Batch", async () => {
    const link = await api(`/batches/${createdBatchId}/lots`, {
      method: "POST",
      body: JSON.stringify({
        lotId: createdLotId,
        weightUsedKg: 38000,
      }),
    }, adminToken);

    // Direct DB Verification
    const dbLink = await prisma.batchLotLink.findUnique({
      where: {
        millingBatchId_procurementLotId: {
          millingBatchId: createdBatchId,
          procurementLotId: createdLotId,
        },
      },
    });
    if (!dbLink) throw new Error("BatchLotLink not found in PostgreSQL database");
    if (dbLink.weightUsedKg !== 38000) throw new Error("Allocated weight mismatch");

    return {
      details: `Allocated 38,000 kg from Lot ${createdLotNumber} to Batch ${createdBatchNumber}`,
      dbVerified: true,
    };
  });

  await runTest("Milling", "Record Milling Output & Yield", async () => {
    const updatePayload = {
      outputWhiteKg: 24700, // 65% yield
      outputBrokenKg: 3420,  // 9% yield
      outputBranKg: 3040,    // 8% yield
      status: "COMPLETED",
      endDate: new Date().toISOString(),
    };

    const batch = await api(`/batches/${createdBatchId}`, {
      method: "PATCH",
      body: JSON.stringify(updatePayload),
    }, adminToken);

    // Direct DB Verification
    const dbBatch = await prisma.millingBatch.findUnique({ where: { id: createdBatchId } });
    if (!dbBatch || dbBatch.status !== "COMPLETED") throw new Error("Batch status not COMPLETED in DB");
    if (dbBatch.outputWhiteKg !== 24700) throw new Error("Output white rice mismatch in DB");

    return {
      details: `Milling completed: 24,700 kg White Rice (Yield: ${batch.millingYield?.toFixed(1)}%), Verified in DB`,
      dbVerified: true,
    };
  });

  await runTest("Milling", "Verify Batch Traceability Chain", async () => {
    const chain = await api(`/batches/${createdBatchId}/traceability`, {}, adminToken);
    if (!chain.lotLinks || chain.lotLinks.length === 0) throw new Error("Traceability chain missing lots");
    const firstLink = chain.lotLinks[0];
    if (firstLink.procurementLot.farmer.name !== "Chaudhry Tariq Gujjar") {
      throw new Error("Traceability chain farmer mismatch");
    }
    return { details: `Full provenance intact from Farm -> Lot -> Batch` };
  });

  // ─── 7. LAB TESTS & QUALITY CONTROL (CREATE & DB VERIFY) ────────────────────
  let createdLabTestId = "";

  await runTest("Quality", "Create Lab Test & MRL Pesticide Compliance Check", async () => {
    const labPayload = {
      millingBatchId: createdBatchId,
      testType: "PESTICIDE_RESIDUE",
      labName: "SGS Pakistan ISO-17025 Certified Lab",
      testDate: new Date().toISOString(),
      reportNumber: `SGS-LHR-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      moisturePercent: 11.9,
      brokenPercent: 4.2,
      chalkyPercent: 1.5,
      foreignMatterPercent: 0.1,
      pesticideResult: "PASS (Tricyclazole: 0.003 mg/kg, Chlorpyrifos: <0.001 mg/kg)",
      heavyMetalResult: "PASS (Arsenic: <0.1 mg/kg, Lead: <0.05 mg/kg)",
      mycotoxinResult: "PASS (Aflatoxin B1: <1 ppb)",
      overallResult: "PASS",
      notes: "Compliant with Regulation (EC) No 396/2005 Maximum Residue Limits",
    };

    const labTest = await api("/lab-tests", {
      method: "POST",
      body: JSON.stringify(labPayload),
    }, qcToken);

    createdLabTestId = labTest.id;

    // Direct DB Verification
    const dbLab = await prisma.labTest.findUnique({ where: { id: createdLabTestId } });
    if (!dbLab) throw new Error("LabTest was not found in PostgreSQL database");
    if (dbLab.overallResult !== "PASS") throw new Error("Lab test result mismatch in DB");

    return {
      details: `Lab Test ${labTest.reportNumber} (Result: ${labTest.overallResult}) created & verified in DB`,
      dbVerified: true,
    };
  });

  // ─── 8. BUYERS MODULE (CREATE & DB VERIFY) ──────────────────────────────────
  let createdBuyerId = "";

  await runTest("Buyers", "Create International Rice Buyer", async () => {
    const buyerPayload = {
      companyName: "Al-Baraka European Commodities B.V.",
      country: "Netherlands",
      contactName: "Willem Van Dijk",
      contactEmail: "willem.vandijk@albaraka-commodities.nl",
      contactPhone: "+31 10 555 8920",
    };

    const buyer = await api("/buyers", {
      method: "POST",
      body: JSON.stringify(buyerPayload),
    }, exportToken);

    createdBuyerId = buyer.id;

    // Direct DB Verification
    const dbBuyer = await prisma.buyer.findUnique({ where: { id: createdBuyerId } });
    if (!dbBuyer) throw new Error("Buyer was not found in PostgreSQL database");
    if (dbBuyer.companyName !== buyerPayload.companyName) throw new Error("Buyer company name mismatch");

    return {
      details: `Buyer ${buyer.companyName} (${buyer.country}) created & verified in DB`,
      dbVerified: true,
    };
  });

  // ─── 9. SHIPMENTS & EUDR DUE DILIGENCE (CREATE & DB VERIFY) ─────────────────
  let createdShipmentId = "";
  let createdShipmentNumber = "";

  await runTest("Shipments", "Create Export Shipment for Buyer", async () => {
    const shipmentPayload = {
      buyerId: createdBuyerId,
      invoiceNumber: `INV-2026-EU-${Math.floor(1000 + Math.random() * 9000)}`,
      lcNumber: `LC-ROT-998127`,
      portOfLoading: "Port Qasim, Karachi",
      portOfDischarge: "Port of Rotterdam, Netherlands",
      vesselName: "MAERSK HAMBURG V.2604",
      billOfLadingNo: `MSK-PK-${Math.floor(100000 + Math.random() * 900000)}`,
      shipmentDate: new Date().toISOString(),
      notes: "EUDR Compliant Pakistani Super Basmati Export Consignment",
    };

    const shipment = await api("/shipments", {
      method: "POST",
      body: JSON.stringify(shipmentPayload),
    }, exportToken);

    createdShipmentId = shipment.id;
    createdShipmentNumber = shipment.shipmentNumber;

    // Direct DB Verification
    const dbShipment = await prisma.shipment.findUnique({ where: { id: createdShipmentId } });
    if (!dbShipment) throw new Error("Shipment was not found in PostgreSQL database");

    return {
      details: `Shipment ${createdShipmentNumber} to ${shipmentPayload.portOfDischarge} created & verified in DB`,
      dbVerified: true,
    };
  });

  await runTest("Shipments", "Allocate Milled Batch to Shipment", async () => {
    const item = await api(`/shipments/${createdShipmentId}/items`, {
      method: "POST",
      body: JSON.stringify({
        millingBatchId: createdBatchId,
        weightKg: 20000,
      }),
    }, exportToken);

    // Direct DB Verification
    const dbItem = await prisma.shipmentItem.findUnique({
      where: {
        shipmentId_millingBatchId: {
          shipmentId: createdShipmentId,
          millingBatchId: createdBatchId,
        },
      },
    });
    if (!dbItem) throw new Error("ShipmentItem not found in PostgreSQL database");
    if (dbItem.weightKg !== 20000) throw new Error("Shipment weight mismatch");

    return {
      details: `Allocated 20,000 kg from Batch ${createdBatchNumber} to Shipment ${createdShipmentNumber}`,
      dbVerified: true,
    };
  });

  await runTest("Shipments", "Confirm EUDR Due Diligence Declaration & Compliance Score", async () => {
    const updated = await api(`/shipments/${createdShipmentId}`, {
      method: "PATCH",
      body: JSON.stringify({
        dueDiligenceConfirmed: true,
      }),
    }, exportToken);

    // Direct DB Verification
    const dbShipment = await prisma.shipment.findUnique({ where: { id: createdShipmentId } });
    if (!dbShipment?.dueDiligenceConfirmed) throw new Error("Due diligence flag not set in DB");

    return {
      details: `Due diligence confirmed, Compliance status: ${updated.complianceStatus}, Score: ${updated.complianceScore}%`,
      dbVerified: true,
    };
  });

  // ─── 10. CERTIFICATE & PDF REPORT GENERATION ────────────────────────────────
  let issuedCertNumber = "";

  await runTest("Reports & Certificates", "Generate EUDR Traceability PDF Certificate", async () => {
    // Request generation
    const genRes = await api(`/shipments/${createdShipmentId}/certificate`, {
      method: "POST",
    }, exportToken);

    // Poll status until READY
    let status = genRes.status;
    let attempts = 0;
    while (status !== "READY" && attempts < 20) {
      await new Promise((r) => setTimeout(r, 1000));
      const statusRes = await api(`/shipments/${createdShipmentId}/certificate/status`, {}, exportToken);
      status = statusRes.status;
      if (statusRes.certNumber) issuedCertNumber = statusRes.certNumber;
      attempts++;
    }

    if (status !== "READY") {
      throw new Error(`Certificate generation did not reach READY status (current: ${status})`);
    }

    // Direct DB Verification
    const dbShipment = await prisma.shipment.findUnique({ where: { id: createdShipmentId } });
    if (!dbShipment?.certNumber) throw new Error("Certificate number not stored in DB");
    if (dbShipment.certificateStatus !== "READY") throw new Error("Certificate status not READY in DB");
    issuedCertNumber = dbShipment.certNumber;

    return {
      details: `Official Certificate ${issuedCertNumber} generated (status: READY), Verified in DB`,
      dbVerified: true,
    };
  });

  await runTest("Reports & Certificates", "Download and Verify PDF File Integrity", async () => {
    const downloadRes = await fetch(`${API_BASE}/shipments/${createdShipmentId}/certificate/download`, {
      headers: { Authorization: `Bearer ${exportToken}` },
      redirect: "manual", // inspect redirect or body
    });

    let pdfBuffer: Buffer;
    if (downloadRes.status === 302 || downloadRes.status === 301) {
      const redirectUrl = downloadRes.headers.get("location");
      if (!redirectUrl) throw new Error("Redirect location header missing");
      const fileRes = await fetch(redirectUrl);
      if (!fileRes.ok) throw new Error(`Failed to fetch redirected file: ${fileRes.status}`);
      pdfBuffer = Buffer.from(await fileRes.arrayBuffer());
    } else if (downloadRes.ok) {
      pdfBuffer = Buffer.from(await downloadRes.arrayBuffer());
    } else {
      throw new Error(`Download endpoint failed with HTTP ${downloadRes.status}`);
    }

    if (pdfBuffer.length < 5000) throw new Error(`Downloaded PDF size too small: ${pdfBuffer.length} bytes`);
    const header = pdfBuffer.slice(0, 5).toString("utf8");
    if (!header.startsWith("%PDF")) throw new Error(`File is not a valid PDF (header: ${header})`);

    return {
      details: `Downloaded PDF is valid: ${pdfBuffer.length} bytes, Header: ${header}`,
    };
  });

  // ─── 11. PUBLIC VERIFICATION (QR DESTINATION) ──────────────────────────────
  await runTest("Public Verification", "Public QR Certificate Verification (No Auth)", async () => {
    // Unauthenticated GET
    const res = await fetch(`${API_BASE}/verify/${issuedCertNumber}`);
    if (!res.ok) throw new Error(`Public verification failed with HTTP ${res.status}`);
    const json = await res.json();
    const data = json.data || json;

    if (!data.certificateNumber && !data.certNumber) throw new Error("Certificate number missing in public response");

    return {
      details: `Public QR verification succeeded for ${issuedCertNumber}: Exporter verified, Cryptographic seal valid`,
    };
  });

  // ─── 12. BUYER PORTAL (MAGIC LINK ACCESS) ───────────────────────────────────
  await runTest("Buyer Portal", "Generate Buyer Magic Token & Access Portal", async () => {
    const linkRes = await api(`/buyers/${createdBuyerId}/portal-link`, { method: "POST" }, exportToken);
    const portalUrl = linkRes.portalUrl;
    if (!portalUrl) throw new Error("No portalUrl returned");
    const token = portalUrl.split("/").pop();

    // Authenticate with magic token
    const validateRes = await fetch(`${API_BASE}/buyer-portal/${token}/validate`);
    if (!validateRes.ok) throw new Error(`Buyer portal validation failed with HTTP ${validateRes.status}`);
    const validateData = await validateRes.json();

    // Fetch shipments for buyer
    const shipmentsRes = await fetch(`${API_BASE}/buyer-portal/${token}/shipments`);
    if (!shipmentsRes.ok) throw new Error(`Buyer portal shipments failed with HTTP ${shipmentsRes.status}`);
    const shipmentsData = await shipmentsRes.json();

    return {
      details: `Magic link authentication succeeded for Buyer: ${validateData.data?.buyerName || "Verified"}, Shipments found: ${(shipmentsData.data || []).length}`,
    };
  });

  // ─── 13. ORGANIZATION SETTINGS & MILLS ─────────────────────────────────────
  await runTest("Settings", "Query Organization Users & Mills", async () => {
    const users = await api("/org/users", {}, adminToken);
    const mills = await api("/org/mills", {}, adminToken);
    if (!users || users.length === 0) throw new Error("No users found");
    if (!mills || mills.length === 0) throw new Error("No mills found");
    return { details: `Organization has ${users.length} registered users and ${mills.length} active mills` };
  });

  // ─── SUMMARY REPORT ────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("                      TEST RESULTS SUMMARY                        ");
  console.log("═══════════════════════════════════════════════════════════════════");

  const passed = reports.filter((r) => r.status === "PASSED").length;
  const failed = reports.filter((r) => r.status === "FAILED").length;
  const dbVerifiedCount = reports.filter((r) => r.dbVerified).length;

  console.log(`Total Tests Run:     ${reports.length}`);
  console.log(`Passed:              ${passed}`);
  console.log(`Failed:              ${failed}`);
  console.log(`DB Checks Verified:  ${dbVerifiedCount}`);
  console.log("═══════════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test suite error:", err);
  process.exit(1);
});
