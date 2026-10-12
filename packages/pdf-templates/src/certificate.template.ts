export interface CertificateData {
  // Certificate meta
  certNumber: string; // e.g. CERT-2024-00042
  issueDate: string; // formatted: "November 15, 2024"
  verifyUrl: string; // e.g. https://app.ricetrace.pk/verify/CERT-2024-00042

  // Organization / Exporter
  orgName: string;
  orgAddress: string;
  orgLogo?: string; // base64 data URI or URL
  preaLicenseNumber?: string;

  // Buyer
  buyerCompany: string;
  buyerCountry: string;
  buyerContact?: string;

  // Shipment
  shipmentNumber: string;
  invoiceNumber?: string;
  lcNumber?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  vesselName?: string;
  shipmentDate?: string;
  totalWeightKg: number;
  riceVariety: string;

  // Compliance
  complianceScore: number;
  complianceStatus: 'COMPLIANT' | 'AT_RISK' | 'INCOMPLETE';
  complianceChecks: Array<{
    id: string;
    label: string;
    passed: boolean;
    detail: string | null;
    points: number;
  }>;

  // Traceability
  batches: Array<{
    batchNumber: string;
    weightKg: number;
    millingDate?: string;
    millName: string;
  }>;
  lots: Array<{
    lotNumber: string;
    farmerName: string;
    farmerCnic: string;
    district: string;
    weightKg: number;
    variety: string;
    dateReceived: string;
    eudrRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'PENDING';
  }>;
  farms: Array<{
    farmerName: string;
    farmDistrict: string;
    farmTehsil?: string;
    areaAcres: number;
    geoLat: number;
    geoLng: number;
    eudrRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'PENDING';
    eudrCheckedAt?: string;
  }>;

  // Lab tests
  labTests: Array<{
    testType: string;
    labName: string;
    testDate: string;
    reportNumber?: string;
    overallResult: 'PASS' | 'FAIL' | 'CONDITIONAL' | 'PENDING';
    pesticideResult?: string;
    moisturePercent?: number;
  }>;

  // QR code
  qrCodeDataUri: string; // base64 PNG data URI of the QR code

  // Due diligence
  dueDiligenceConfirmed: boolean;
  dueDiligenceConfirmedBy?: string;
  dueDiligenceConfirmedAt?: string;
}

export function renderCertificateHTML(data: CertificateData): string {
  const complianceBannerBg =
    data.complianceStatus === 'COMPLIANT'
      ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
      : data.complianceStatus === 'AT_RISK'
      ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
      : 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)';

  const complianceBannerBorder =
    data.complianceStatus === 'COMPLIANT'
      ? '#10b981'
      : data.complianceStatus === 'AT_RISK'
      ? '#ef4444'
      : '#f59e0b';

  const scoreCircleBg =
    data.complianceStatus === 'COMPLIANT'
      ? '#10b981'
      : data.complianceStatus === 'AT_RISK'
      ? '#ef4444'
      : '#f59e0b';

  const complianceTitleColor =
    data.complianceStatus === 'COMPLIANT'
      ? '#065f46'
      : data.complianceStatus === 'AT_RISK'
      ? '#7f1d1d'
      : '#78350f';

  const uniqueDistricts = [...new Set(data.farms.map((f) => f.farmDistrict))].join(', ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RiceTrace Traceability Certificate ${data.certNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      line-height: 1.5;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm 15mm 20mm 15mm;
      background: #ffffff;
    }
    /* ─── HEADER ──────────────────────────────── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #10b981;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .logo { width: 60px; height: 60px; object-fit: contain; }
    .logo-placeholder {
      width: 60px; height: 60px; background: #10b981;
      border-radius: 8px; display: flex; align-items: center;
      justify-content: center; color: white; font-weight: bold; font-size: 18px;
    }
    .org-name { font-size: 16px; font-weight: 700; color: #0f172a; }
    .org-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
    .header-right { text-align: right; }
    .cert-title { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .cert-number { font-size: 13px; color: #10b981; font-weight: 600; margin-top: 3px; }
    .cert-date { font-size: 10px; color: #64748b; margin-top: 2px; }

    /* ─── TWO-COLUMN INFO ─────────────────────── */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
    .info-box-title {
      font-size: 9px; font-weight: 700; color: #64748b;
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0;
    }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .info-label { color: #64748b; font-size: 10px; }
    .info-value { font-weight: 600; font-size: 10px; color: #0f172a; text-align: right; }

    /* ─── COMPLIANCE SCORE ────────────────────── */
    .compliance-banner {
      background: ${complianceBannerBg};
      border: 1px solid ${complianceBannerBorder};
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .compliance-left { display: flex; align-items: center; gap: 14px; }
    .score-circle {
      width: 60px; height: 60px; border-radius: 50%;
      background: ${scoreCircleBg};
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; color: white;
    }
    .score-number { font-size: 20px; font-weight: 800; line-height: 1; }
    .score-label { font-size: 8px; font-weight: 600; opacity: 0.9; }
    .compliance-title {
      font-size: 15px; font-weight: 700;
      color: ${complianceTitleColor};
    }
    .compliance-sub { font-size: 10px; color: #374151; margin-top: 3px; }

    /* ─── COMPLIANCE CHECKLIST ────────────────── */
    .checklist-title {
      font-size: 10px; font-weight: 700; color: #0f172a;
      margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .checklist { display: flex; flex-direction: column; gap: 5px; }
    .check-item {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 6px 10px; background: #f8fafc; border-radius: 5px;
      border-left: 3px solid transparent;
    }
    .check-icon { font-size: 13px; flex-shrink: 0; margin-top: 0px; }
    .check-label { font-size: 10px; font-weight: 600; color: #0f172a; }
    .check-detail { font-size: 9px; color: #64748b; margin-top: 1px; }
    .check-points { margin-left: auto; font-size: 9px; font-weight: 700; flex-shrink: 0; }

    /* ─── QR CODE SECTION ─────────────────────── */
    .qr-section {
      display: flex; align-items: center; gap: 14px;
      margin-top: 14px; padding: 12px 14px;
      background: #0f172a; border-radius: 8px; color: white;
    }
    .qr-image { width: 70px; height: 70px; flex-shrink: 0; }
    .qr-title { font-size: 12px; font-weight: 700; margin-bottom: 3px; }
    .qr-sub { font-size: 9px; color: #94a3b8; line-height: 1.4; }
    .qr-url { font-size: 9px; color: #10b981; margin-top: 4px; word-break: break-all; }

    /* ─── DUE DILIGENCE ───────────────────────── */
    .dd-box {
      margin-top: 12px; padding: 10px 12px;
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px;
    }
    .dd-title { font-size: 10px; font-weight: 700; color: #1e40af; margin-bottom: 4px; }
    .dd-text { font-size: 9px; color: #374151; line-height: 1.5; }
    .dd-sig { font-size: 9px; color: #64748b; margin-top: 6px; font-style: italic; }

    /* ─── FOOTER ──────────────────────────────── */
    .footer {
      position: fixed; bottom: 15mm; left: 15mm; right: 15mm;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px;
    }

    /* ─── PAGE 2 TABLES ───────────────────────── */
    .section-title {
      font-size: 12px; font-weight: 700; color: #0f172a;
      margin: 16px 0 8px 0; padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 6px;
    }
    .section-badge {
      font-size: 9px; font-weight: 600;
      background: #10b981; color: white; padding: 2px 7px; border-radius: 10px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 14px; }
    thead tr { background: #0f172a; color: white; }
    thead th {
      padding: 7px 10px; text-align: left; font-size: 9px;
      font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;
    }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }

    .badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 9px; font-weight: 600; }
    .badge-low { background: #d1fae5; color: #065f46; }
    .badge-medium { background: #fef9c3; color: #78350f; }
    .badge-high { background: #fee2e2; color: #7f1d1d; }
    .badge-pending, .badge-pend { background: #f1f5f9; color: #475569; }
    .badge-pass { background: #d1fae5; color: #065f46; }
    .badge-fail { background: #fee2e2; color: #7f1d1d; }
    .badge-cond { background: #fef9c3; color: #78350f; }
  </style>
</head>
<body>

  <!-- ═══════════════════════════════════════════════════════════════ -->
  <!-- PAGE 1 — SUMMARY & COMPLIANCE                                  -->
  <!-- ═══════════════════════════════════════════════════════════════ -->
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        ${data.orgLogo ? `<img class="logo" src="${data.orgLogo}" alt="Logo" />` : `<div class="logo-placeholder">${data.orgName.charAt(0)}</div>`}
        <div>
          <div class="org-name">${data.orgName}</div>
          <div class="org-sub">${data.orgAddress}</div>
          ${data.preaLicenseNumber ? `<div class="org-sub">PREA License: ${data.preaLicenseNumber}</div>` : ''}
        </div>
      </div>
      <div class="header-right">
        <div class="cert-title">TRACEABILITY CERTIFICATE</div>
        <div class="cert-number">${data.certNumber}</div>
        <div class="cert-date">Issued: ${data.issueDate}</div>
      </div>
    </div>

    <!-- Exporter + Buyer Info -->
    <div class="two-col">
      <div class="info-box">
        <div class="info-box-title">Exporter Details</div>
        <div class="info-row">
          <span class="info-label">Company</span>
          <span class="info-value">${data.orgName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Country</span>
          <span class="info-value">Pakistan</span>
        </div>
        ${data.preaLicenseNumber ? `
        <div class="info-row">
          <span class="info-label">PREA License</span>
          <span class="info-value">${data.preaLicenseNumber}</span>
        </div>` : ''}
      </div>

      <div class="info-box">
        <div class="info-box-title">Buyer Details</div>
        <div class="info-row">
          <span class="info-label">Company</span>
          <span class="info-value">${data.buyerCompany}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Country</span>
          <span class="info-value">${data.buyerCountry}</span>
        </div>
        ${data.buyerContact ? `
        <div class="info-row">
          <span class="info-label">Contact</span>
          <span class="info-value">${data.buyerContact}</span>
        </div>` : ''}
      </div>
    </div>

    <!-- Shipment Details -->
    <div class="info-box" style="margin-bottom: 12px;">
      <div class="info-box-title">Shipment Details</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 16px;">
        <div class="info-row">
          <span class="info-label">Shipment No.</span>
          <span class="info-value">${data.shipmentNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Invoice No.</span>
          <span class="info-value">${data.invoiceNumber || '—'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">L/C No.</span>
          <span class="info-value">${data.lcNumber || '—'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Commodity</span>
          <span class="info-value">Rice (HS 1006) · ${data.riceVariety}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Net Weight</span>
          <span class="info-value">${data.totalWeightKg.toLocaleString()} kg</span>
        </div>
        <div class="info-row">
          <span class="info-label">Vessel</span>
          <span class="info-value">${data.vesselName || '—'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Port of Loading</span>
          <span class="info-value">${data.portOfLoading || '—'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Port of Discharge</span>
          <span class="info-value">${data.portOfDischarge || '—'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Shipment Date</span>
          <span class="info-value">${data.shipmentDate || '—'}</span>
        </div>
      </div>
    </div>

    <!-- Compliance Score Banner -->
    <div class="compliance-banner">
      <div class="compliance-left">
        <div class="score-circle">
          <span class="score-number">${data.complianceScore}</span>
          <span class="score-label">/ 100</span>
        </div>
        <div>
          <div class="compliance-title">
            ${data.complianceStatus === 'COMPLIANT' ? '✅ EUDR COMPLIANT' : data.complianceStatus === 'AT_RISK' ? '⚠️ COMPLIANCE AT RISK' : '⏳ COMPLIANCE INCOMPLETE'}
          </div>
          <div class="compliance-sub">
            ${data.complianceStatus === 'COMPLIANT'
              ? 'This shipment meets EU Deforestation Regulation requirements.'
              : data.complianceStatus === 'AT_RISK'
              ? 'This shipment has unresolved compliance issues. Review before dispatch.'
              : 'Some compliance data is still pending. Complete before generating final certificate.'}
          </div>
        </div>
      </div>
    </div>

    <!-- Compliance Checklist -->
    <div class="checklist-title">Compliance Checklist</div>
    <div class="checklist">
      ${data.complianceChecks.map(check => `
        <div class="check-item" style="border-left-color: ${check.passed ? '#10b981' : '#ef4444'};">
          <span class="check-icon">${check.passed ? '✅' : '❌'}</span>
          <div style="flex: 1;">
            <div class="check-label">${check.label}</div>
            ${check.detail ? `<div class="check-detail">${check.detail}</div>` : ''}
          </div>
          <span class="check-points" style="color: ${check.passed ? '#10b981' : '#94a3b8'};">
            ${check.passed ? '+' : ''}${check.passed ? check.points : 0}/${check.points} pts
          </span>
        </div>
      `).join('')}
    </div>

    <!-- Due Diligence Statement -->
    ${data.dueDiligenceConfirmed ? `
    <div class="dd-box">
      <div class="dd-title">EUDR Due Diligence Statement — Article 4</div>
      <div class="dd-text">
        We, <strong>${data.orgName}</strong>, hereby declare that the commodity described in shipment
        <strong>${data.shipmentNumber}</strong> (Rice, HS 1006) was produced in Pakistan and was not sourced
        from land that was subject to deforestation or forest degradation after <strong>December 31, 2020</strong>.
        This declaration is supported by GPS-referenced farm records for <strong>${data.farms.length} farms</strong>
        across <strong>${uniqueDistricts}</strong>, verified against Global Forest Watch deforestation alert data.
      </div>
      <div class="dd-sig">
        Confirmed by: ${data.dueDiligenceConfirmedBy || data.orgName}
        ${data.dueDiligenceConfirmedAt ? `· ${data.dueDiligenceConfirmedAt}` : ''}
      </div>
    </div>
    ` : ''}

    <!-- QR Code -->
    <div class="qr-section">
      <img class="qr-image" src="${data.qrCodeDataUri}" alt="Verification QR Code" />
      <div>
        <div class="qr-title">Digital Verification</div>
        <div class="qr-sub">
          Scan this QR code or visit the URL below to verify the authenticity of this
          certificate in real time. Powered by RiceTrace — Traceability for a Sustainable Future.
        </div>
        <div class="qr-url">${data.verifyUrl}</div>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════ -->
  <!-- PAGE BREAK                                                    -->
  <!-- ═══════════════════════════════════════════════════════════════ -->
  <div style="page-break-after: always;"></div>

  <!-- ═══════════════════════════════════════════════════════════════ -->
  <!-- PAGE 2 — TRACEABILITY CHAIN                                   -->
  <!-- ═══════════════════════════════════════════════════════════════ -->
  <div class="page">
    <div class="header" style="border-bottom-color: #10b981;">
      <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
        ${data.certNumber} — Supply Chain Traceability
      </div>
      <div style="font-size: 10px; color: #64748b;">Page 2 of 3</div>
    </div>

    <!-- Milling Batches -->
    <div class="section-title">
      Milling Batches <span class="section-badge">${data.batches.length} batches</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Batch Number</th>
          <th>Mill</th>
          <th>Milling Date</th>
          <th>Weight (kg)</th>
        </tr>
      </thead>
      <tbody>
        ${data.batches.map(b => `
          <tr>
            <td><strong>${b.batchNumber}</strong></td>
            <td>${b.millName}</td>
            <td>${b.millingDate || '—'}</td>
            <td>${b.weightKg.toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Procurement Lots -->
    <div class="section-title">
      Procurement Lots (Source Paddy) <span class="section-badge">${data.lots.length} lots</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Lot Number</th>
          <th>Farmer</th>
          <th>District</th>
          <th>Variety</th>
          <th>Weight (kg)</th>
          <th>Date</th>
          <th>EUDR</th>
        </tr>
      </thead>
      <tbody>
        ${data.lots.map(l => `
          <tr>
            <td><strong>${l.lotNumber}</strong></td>
            <td>${l.farmerName}</td>
            <td>${l.district}</td>
            <td>${l.variety}</td>
            <td>${l.weightKg.toLocaleString()}</td>
            <td>${l.dateReceived}</td>
            <td>
              <span class="badge badge-${l.eudrRisk.toLowerCase()}">
                ${l.eudrRisk}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Farm GPS Coordinates -->
    <div class="section-title">
      Farm GPS Coordinates & EUDR Status <span class="section-badge">${data.farms.length} farms</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Farmer</th>
          <th>District / Tehsil</th>
          <th>Area (Acres)</th>
          <th>Latitude</th>
          <th>Longitude</th>
          <th>EUDR Risk</th>
          <th>Checked</th>
        </tr>
      </thead>
      <tbody>
        ${data.farms.map(f => `
          <tr>
            <td>${f.farmerName}</td>
            <td>${f.farmDistrict}${f.farmTehsil ? `, ${f.farmTehsil}` : ''}</td>
            <td>${f.areaAcres.toFixed(2)}</td>
            <td>${f.geoLat.toFixed(6)}°N</td>
            <td>${f.geoLng.toFixed(6)}°E</td>
            <td>
              <span class="badge badge-${f.eudrRisk.toLowerCase()}">
                ${f.eudrRisk === 'LOW' ? '✓ LOW' : f.eudrRisk === 'HIGH' ? '✗ HIGH' : f.eudrRisk === 'MEDIUM' ? '~ MEDIUM' : '? PENDING'}
              </span>
            </td>
            <td>${f.eudrCheckedAt || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════ -->
  <!-- PAGE BREAK                                                    -->
  <!-- ═══════════════════════════════════════════════════════════════ -->
  <div style="page-break-after: always;"></div>

  <!-- ═══════════════════════════════════════════════════════════════ -->
  <!-- PAGE 3 — QUALITY & LAB CERTIFICATIONS                         -->
  <!-- ═══════════════════════════════════════════════════════════════ -->
  <div class="page">
    <div class="header" style="border-bottom-color: #10b981;">
      <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
        ${data.certNumber} — Quality & Lab Certifications
      </div>
      <div style="font-size: 10px; color: #64748b;">Page 3 of 3</div>
    </div>

    <!-- Lab Tests -->
    <div class="section-title">
      Laboratory Test Results <span class="section-badge">${data.labTests.length} tests</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Test Type</th>
          <th>Laboratory</th>
          <th>Test Date</th>
          <th>Report No.</th>
          <th>Pesticide</th>
          <th>Moisture%</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        ${data.labTests.map(t => `
          <tr>
            <td>${t.testType.replace(/_/g, ' ')}</td>
            <td>${t.labName}</td>
            <td>${t.testDate}</td>
            <td>${t.reportNumber || '—'}</td>
            <td>${t.pesticideResult || '—'}</td>
            <td>${t.moisturePercent != null ? t.moisturePercent + '%' : '—'}</td>
            <td>
              <span class="badge ${t.overallResult === 'PASS' ? 'badge-pass' : t.overallResult === 'FAIL' ? 'badge-fail' : t.overallResult === 'CONDITIONAL' ? 'badge-cond' : 'badge-pend'}">
                ${t.overallResult}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Pesticide Declarations note -->
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px 12px; margin-top: 8px;">
      <div style="font-size:10px; font-weight:700; color:#0f172a; margin-bottom:4px;">
        Pesticide Input Declaration
      </div>
      <div style="font-size:9px; color:#374151; line-height:1.5;">
        All procurement lots in this shipment carry farmer-declared pesticide and fertilizer input records,
        logged at point of purchase by RiceTrace-certified procurement officers. Original declarations
        are retained in the RiceTrace system and available for regulatory audit upon request.
      </div>
    </div>

    <!-- Legal footer -->
    <div style="margin-top: 24px; padding: 14px 16px; background: #0f172a; border-radius: 8px; color: white;">
      <div style="font-size: 10px; font-weight: 700; margin-bottom: 6px;">
        Legal Notice & Certificate Validity
      </div>
      <div style="font-size: 9px; color: #94a3b8; line-height: 1.6;">
        This certificate is issued by <strong style="color:white;">${data.orgName}</strong> using the
        RiceTrace Traceability Platform. The data presented herein is based on information recorded
        by mill operators, procurement officers, and accredited laboratories. RiceTrace provides
        the traceability infrastructure but does not independently verify physical commodity or
        laboratory claims. This certificate is intended to support EUDR due diligence obligations
        under Regulation (EU) 2023/1115. Certificate authenticity can be verified at:
        <span style="color:#10b981;">${data.verifyUrl}</span>
      </div>
    </div>

    <!-- Signature block -->
    <div style="margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <div style="border-top: 1px solid #e2e8f0; padding-top: 8px;">
        <div style="font-size: 9px; color: #64748b;">Authorized Signatory — ${data.orgName}</div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 20px;">Signature & Company Seal</div>
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 8px;">
        <div style="font-size: 9px; color: #64748b;">Generated by RiceTrace Platform</div>
        <div style="font-size: 10px; font-weight: 600; color: #0f172a; margin-top: 4px;">
          ${data.certNumber}
        </div>
        <div style="font-size: 9px; color: #64748b;">${data.issueDate}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
