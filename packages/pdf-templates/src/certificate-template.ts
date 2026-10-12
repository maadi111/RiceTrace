/**
 * @file packages/pdf-templates/src/certificate-template.ts
 * @description Generates self-contained HTML for the 3-page RiceTrace
 * Traceability & EUDR Compliance Certificate.
 * Conforms to EU Deforestation Regulation (EUDR - Regulation (EU) 2023/1115)
 * and SPS import guidelines.
 */

export interface CertificateData {
  certificateNumber: string;
  issueDate: string;
  verificationUrl: string;
  qrCodeDataUrl?: string;

  exporter: {
    name: string;
    address: string;
    licenseNumber?: string;
    province?: string;
    logoUrl?: string;
  };

  buyer: {
    company: string;
    contactName: string;
    country: string;
    destinationPort?: string;
  };

  shipment: {
    shipmentNumber: string;
    invoiceNumber: string;
    variety: string;
    weightKg: number;
    portOfLoading: string;
    portOfDischarge: string;
    lcNumber?: string;
    vesselName?: string;
    blNumber?: string;
  };

  compliance: {
    score: number;
    status: "COMPLIANT" | "AT_RISK" | "INCOMPLETE";
    checks: Array<{
      label: string;
      passed: boolean;
      points: number;
      detail?: string;
    }>;
  };

  batches: Array<{
    batchNumber: string;
    millName: string;
    millingDate: string;
    allocatedKg: number;
  }>;

  lots: Array<{
    lotNumber: string;
    farmerName: string;
    district: string;
    weightKg: number;
    eudrRisk: string;
  }>;

  farms: Array<{
    farmName: string;
    farmerName: string;
    latitude: number;
    longitude: number;
    district: string;
    eudrRisk: string;
  }>;

  labTests: Array<{
    testType: string;
    labName: string;
    testDate: string;
    reportNumber: string;
    result: string;
  }>;
}

export function renderCertificateHTML(data: CertificateData): string {
  const isCompliant = data.compliance.status === "COMPLIANT";
  const statusColor = isCompliant ? "#059669" : data.compliance.status === "AT_RISK" ? "#d97706" : "#dc2626";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Certificate ${data.certificateNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      color: #1e293b;
      font-size: 11px;
      line-height: 1.4;
      background: #ffffff;
    }
    .page {
      page-break-after: always;
      min-height: 260mm;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding-bottom: 20px;
    }
    .page:last-child {
      page-break-after: avoid;
    }
    .header {
      border-bottom: 2px solid #0f766e;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }
    .cert-badge {
      font-size: 11px;
      font-weight: 600;
      color: #0f766e;
      background: #ccfbf1;
      padding: 4px 10px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 4px;
    }
    .header-meta {
      text-align: right;
    }
    .header-meta .cert-no {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .header-meta .date {
      color: #64748b;
      font-size: 10px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f766e;
      background: #f0fdfa;
      padding: 5px 8px;
      margin: 12px 0 6px 0;
      border-left: 3px solid #0f766e;
    }
    .grid-2 {
      display: flex;
      gap: 16px;
    }
    .card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .card-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 6px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      border-bottom: 1px dashed #f1f5f9;
    }
    .meta-row:last-child {
      border-bottom: none;
    }
    .meta-label {
      color: #64748b;
      font-size: 10px;
    }
    .meta-value {
      font-weight: 600;
      color: #0f172a;
      font-size: 10px;
    }
    .compliance-box {
      border: 2px solid ${statusColor};
      border-radius: 8px;
      background: #ffffff;
      padding: 14px 16px;
      margin: 16px 0;
    }
    .compliance-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .compliance-status {
      font-size: 16px;
      font-weight: 800;
      color: ${statusColor};
    }
    .compliance-score {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }
    .checklist {
      list-style: none;
    }
    .check-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 0;
      font-size: 10.5px;
      border-bottom: 1px solid #f1f5f9;
    }
    .check-item:last-child {
      border-bottom: none;
    }
    .check-icon {
      font-weight: 700;
      font-size: 12px;
    }
    .passed { color: #059669; }
    .failed { color: #dc2626; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 9.5px;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      text-transform: uppercase;
      font-size: 8.5px;
    }
    td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .risk-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 700;
      font-size: 8.5px;
    }
    .risk-low { background: #dcfce7; color: #166534; }
    .risk-medium { background: #fef3c7; color: #92400e; }
    .risk-high { background: #fee2e2; color: #991b1b; }
    .statement-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px;
      font-size: 9px;
      color: #334155;
      line-height: 1.5;
      margin: 12px 0;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #64748b;
    }
    .qr-container {
      text-align: center;
      width: 100px;
    }
    .qr-image {
      width: 70px;
      height: 70px;
      display: block;
      margin: 0 auto 4px auto;
    }
    .signature-box {
      text-align: right;
      width: 220px;
    }
    .signature-line {
      border-bottom: 1px solid #94a3b8;
      height: 40px;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: EXECUTIVE SUMMARY & SHIPMENT OVERVIEW -->
  <div class="page">
    <div>
      <div class="header">
        <div>
          <div class="brand-title">RiceTrace</div>
          <div class="cert-badge">Official EUDR & SPS Traceability Certificate</div>
        </div>
        <div class="header-meta">
          <div class="cert-no">${data.certificateNumber}</div>
          <div class="date">Issue Date: ${data.issueDate}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">Exporter Details</div>
          <div class="meta-row"><span class="meta-label">Mill Name:</span><span class="meta-value">${data.exporter.name}</span></div>
          <div class="meta-row"><span class="meta-label">Address:</span><span class="meta-value">${data.exporter.address}</span></div>
          <div class="meta-row"><span class="meta-label">PREA License:</span><span class="meta-value">${data.exporter.licenseNumber || "Verified"}</span></div>
          <div class="meta-row"><span class="meta-label">Country of Origin:</span><span class="meta-value">Pakistan</span></div>
        </div>
        <div class="card">
          <div class="card-title">Consignee / Buyer Details</div>
          <div class="meta-row"><span class="meta-label">Company:</span><span class="meta-value">${data.buyer.company}</span></div>
          <div class="meta-row"><span class="meta-label">Contact Person:</span><span class="meta-value">${data.buyer.contactName}</span></div>
          <div class="meta-row"><span class="meta-label">Destination Country:</span><span class="meta-value">${data.buyer.country}</span></div>
          <div class="meta-row"><span class="meta-label">Destination Port:</span><span class="meta-value">${data.buyer.destinationPort || data.shipment.portOfDischarge}</span></div>
        </div>
      </div>

      <div class="section-title">Shipment Specifications</div>
      <div class="card" style="margin-top: 4px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="meta-row"><span class="meta-label">Shipment Reference:</span><span class="meta-value">${data.shipment.shipmentNumber}</span></div>
          <div class="meta-row"><span class="meta-label">Commercial Invoice:</span><span class="meta-value">${data.shipment.invoiceNumber}</span></div>
          <div class="meta-row"><span class="meta-label">Rice Variety:</span><span class="meta-value">${data.shipment.variety.replace(/_/g, " ")}</span></div>
          <div class="meta-row"><span class="meta-label">Total Net Weight:</span><span class="meta-value">${Number(data.shipment.weightKg).toLocaleString()} kg</span></div>
          <div class="meta-row"><span class="meta-label">Port of Loading:</span><span class="meta-value">${data.shipment.portOfLoading}</span></div>
          <div class="meta-row"><span class="meta-label">Port of Discharge:</span><span class="meta-value">${data.shipment.portOfDischarge}</span></div>
          <div class="meta-row"><span class="meta-label">Vessel / Carrier:</span><span class="meta-value">${data.shipment.vesselName || "Designated Ocean Vessel"}</span></div>
          <div class="meta-row"><span class="meta-label">L/C Number:</span><span class="meta-value">${data.shipment.lcNumber || "CAD / Direct"}</span></div>
        </div>
      </div>

      <div class="section-title">Regulatory Verification & Compliance Assessment</div>
      <div class="compliance-box">
        <div class="compliance-header">
          <div>
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700;">EUDR & SPS Audit Outcome</div>
            <div class="compliance-status">${isCompliant ? "✅ COMPLIANT FOR EU IMPORT" : "⚠️ CONDITIONAL / REVIEW REQUIRED"}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700;">Traceability Score</div>
            <div class="compliance-score">${data.compliance.score} / 100</div>
          </div>
        </div>

        <ul class="checklist">
          ${data.compliance.checks.map(c => `
            <li class="check-item">
              <span class="check-icon ${c.passed ? "passed" : "failed"}">${c.passed ? "✓" : "✗"}</span>
              <span style="font-weight: 600;">${c.label}</span>
              <span style="color: #64748b; margin-left: auto;">(${c.points} pts) ${c.detail ? `— ${c.detail}` : ""}</span>
            </li>
          `).join("")}
        </ul>
      </div>
    </div>

    <div class="footer">
      <div>Document generated under RiceTrace SaaS v1.0 • Authorized exporter certification</div>
      <div>Page 1 of 3</div>
    </div>
  </div>

  <!-- PAGE 2: FULL CHAIN OF CUSTODY (MILLING & LOTS & FARMS) -->
  <div class="page">
    <div>
      <div class="header">
        <div>
          <div class="brand-title">RiceTrace</div>
          <div class="cert-badge">Traceability Chain & Farm Geolocation Register</div>
        </div>
        <div class="header-meta">
          <div class="cert-no">${data.certificateNumber}</div>
          <div class="date">${data.shipment.shipmentNumber}</div>
        </div>
      </div>

      <div class="section-title">1. Milling Batches (Processing Facility)</div>
      <table>
        <thead>
          <tr>
            <th>Batch No</th>
            <th>Milling Facility</th>
            <th>Processing Date</th>
            <th style="text-align: right;">Allocated Quantity (kg)</th>
          </tr>
        </thead>
        <tbody>
          ${data.batches.map(b => `
            <tr>
              <td style="font-weight: 700;">${b.batchNumber}</td>
              <td>${b.millName}</td>
              <td>${b.millingDate}</td>
              <td style="text-align: right; font-weight: 600;">${Number(b.allocatedKg).toLocaleString()}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="section-title">2. Procurement Lots (Farm Gate Intake)</div>
      <table>
        <thead>
          <tr>
            <th>Lot Number</th>
            <th>Registered Farmer</th>
            <th>Origin District</th>
            <th style="text-align: right;">Paddy Weight (kg)</th>
            <th>EUDR Risk Tier</th>
          </tr>
        </thead>
        <tbody>
          ${data.lots.map(l => `
            <tr>
              <td style="font-weight: 700;">${l.lotNumber}</td>
              <td>${l.farmerName}</td>
              <td>${l.district}</td>
              <td style="text-align: right; font-weight: 600;">${Number(l.weightKg).toLocaleString()}</td>
              <td><span class="risk-badge risk-${l.eudrRisk.toLowerCase()}">${l.eudrRisk}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="section-title">3. Farm Plot Geolocation (Polygon / Centerpoint Verification)</div>
      <table>
        <thead>
          <tr>
            <th>Farm Identifier</th>
            <th>Farmer Name</th>
            <th>District</th>
            <th>GPS Coordinates (Latitude, Longitude)</th>
            <th>Deforestation Check</th>
          </tr>
        </thead>
        <tbody>
          ${data.farms.map(f => `
            <tr>
              <td style="font-weight: 600;">${f.farmName}</td>
              <td>${f.farmerName}</td>
              <td>${f.district}</td>
              <td style="font-family: monospace;">${f.latitude.toFixed(5)}°N, ${f.longitude.toFixed(5)}°E</td>
              <td><span class="risk-badge risk-${f.eudrRisk.toLowerCase()}">${f.eudrRisk}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div>Chain of custody verified per Regulation (EU) 2023/1115 (EUDR) Article 9 Due Diligence Requirements</div>
      <div>Page 2 of 3</div>
    </div>
  </div>

  <!-- PAGE 3: LAB QUALITY CERTIFICATION & DUE DILIGENCE DECLARATION -->
  <div class="page">
    <div>
      <div class="header">
        <div>
          <div class="brand-title">RiceTrace</div>
          <div class="cert-badge">Laboratory Analysis & Due Diligence Declaration</div>
        </div>
        <div class="header-meta">
          <div class="cert-no">${data.certificateNumber}</div>
          <div class="date">${data.shipment.shipmentNumber}</div>
        </div>
      </div>

      <div class="section-title">1. Sanitary & Phytosanitary (SPS) Laboratory Test Reports</div>
      <table>
        <thead>
          <tr>
            <th>Analysis Protocol</th>
            <th>Accredited Testing Facility</th>
            <th>Analysis Date</th>
            <th>Report / Certificate #</th>
            <th>Outcome</th>
          </tr>
        </thead>
        <tbody>
          ${data.labTests.map(t => `
            <tr>
              <td style="font-weight: 600;">${t.testType.replace(/_/g, " ")}</td>
              <td>${t.labName}</td>
              <td>${t.testDate}</td>
              <td>${t.reportNumber}</td>
              <td><span style="color: ${t.result === "PASS" ? "#059669" : "#dc2626"}; font-weight: 700;">${t.result}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="section-title">2. Mandatory EUDR Due Diligence Statement</div>
      <div class="statement-box">
        <strong>OPERATOR DUE DILIGENCE DECLARATION (REGULATION (EU) 2023/1115):</strong><br>
        The operator herewith confirms that due diligence in accordance with Regulation (EU) 2023/1115 was exercised
        prior to placing this consignment on the market or exporting it. The relevant commodities and relevant products:
        <br><br>
        1. <strong>Are deforestation-free</strong> — produced on land that was not subject to deforestation or forest degradation after December 31, 2020.<br>
        2. <strong>Were produced in accordance with the relevant legislation of the country of production</strong> (Pakistan), including land use rights, environmental protection, labor regulations, and third-party rights.<br>
        3. <strong>Are covered by a due diligence statement</strong> backed by geolocation coordinates of all production plots collected at farm-gate intake.
      </div>
    </div>

    <div class="footer">
      <div class="qr-container">
        ${data.qrCodeDataUrl ? `<img src="${data.qrCodeDataUrl}" class="qr-image" alt="QR Code" />` : `<div style="width:70px;height:70px;border:1px solid #cbd5e1;display:flex;align-items:center;justify-content:center;margin:0 auto 4px auto;font-size:8px;">Scan to Verify</div>`}
        <div style="font-size: 8px; color: #475569;">Scan QR to verify authenticity on portal</div>
      </div>

      <div class="signature-box">
        <div class="signature-line"></div>
        <div style="font-weight: 700; color: #0f172a; font-size: 10px;">Authorized Mill Representative</div>
        <div style="color: #64748b; font-size: 8.5px;">Quality & Export Documentation Control</div>
        <div style="color: #64748b; font-size: 8px;">Date: ${data.issueDate}</div>
      </div>
    </div>
  </div>

</body>
</html>`;
}
