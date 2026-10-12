/**
 * @file apps/web/src/lib/mock-data.ts
 * @description High-fidelity realistic Pakistani rice export domain data
 * representing the Kallar rice tract (Punjab: Sheikhupura, Hafizabad, Gujranwala).
 * Used for instant interactive preview, test runs, and offline fallback.
 */

export interface MockFarmer {
  id: string;
  name: string;
  fatherName: string;
  cnic: string;
  phone: string;
  village: string;
  district: string;
  tehsil: string;
  farmsCount: number;
  totalLotsCount: number;
  eudrStatus: "LOW" | "MEDIUM" | "HIGH" | "PENDING";
  verified: boolean;
  farms: MockFarm[];
}

export interface MockFarm {
  id: string;
  farmerId: string;
  name: string;
  areaAcres: number;
  district: string;
  tehsil: string;
  khasraNumber: string;
  geoLat: number;
  geoLng: number;
  eudrRisk: "LOW" | "MEDIUM" | "HIGH" | "PENDING";
  hasGps: boolean;
  deforestationAlerts: number;
}

export interface MockLot {
  id: string;
  lotNumber: string;
  farmerId: string;
  farmerName: string;
  farmId: string;
  farmName: string;
  district: string;
  variety: string;
  weightKg: number;
  moisturePercentage: number;
  date: string;
  status: "RECEIVED" | "IN_MILLING" | "MILLED" | "PARTIALLY_MILLED";
  eudrRisk: "LOW" | "MEDIUM" | "HIGH";
  vehicleNumber: string;
  pesticides: Array<{ name: string; phiDays: number }>;
  geoLat: number;
  geoLng: number;
}

export interface MockBatch {
  id: string;
  batchNumber: string;
  variety: string;
  paddyInputKg: number;
  whiteRiceKg: number;
  brokenRiceKg: number;
  branKg: number;
  yieldPercentage: number;
  status: "IN_PROGRESS" | "COMPLETED" | "QUALITY_HOLD";
  startDate: string;
  endDate?: string;
  millName: string;
  linkedLots: MockLot[];
}

export interface MockLabTest {
  id: string;
  batchId: string;
  batchNumber: string;
  testType: string;
  labName: string;
  testDate: string;
  reportNumber: string;
  result: "PASS" | "FAIL" | "CONDITIONAL";
  parameters: Record<string, string | number>;
  certificateUrl?: string;
}

export interface MockShipment {
  id: string;
  shipmentNumber: string;
  invoiceNumber: string;
  buyerCompany: string;
  buyerCountry: string;
  variety: string;
  totalWeightKg: number;
  portOfLoading: string;
  portOfDischarge: string;
  vesselName: string;
  status: "DRAFT" | "UNDER_REVIEW" | "CERTIFICATE_ISSUED" | "SHIPPED";
  complianceScore: number;
  complianceStatus: "COMPLIANT" | "AT_RISK" | "INCOMPLETE";
  certificateUrl?: string;
  certificateNumber?: string;
  batches: MockBatch[];
  checklist: Array<{
    id: string;
    label: string;
    passed: boolean;
    points: number;
    detail?: string;
  }>;
}

export const MOCK_FARMS: MockFarm[] = [
  {
    id: "farm_01",
    farmerId: "f_01",
    name: "Chak 34 Dera Field",
    areaAcres: 14.5,
    district: "Sheikhupura",
    tehsil: "Muridke",
    khasraNumber: "KH-482/1",
    geoLat: 31.7167,
    geoLng: 73.985,
    eudrRisk: "LOW",
    hasGps: true,
    deforestationAlerts: 0,
  },
  {
    id: "farm_02",
    farmerId: "f_01",
    name: "Canal Bank Plot A",
    areaAcres: 8.0,
    district: "Sheikhupura",
    tehsil: "Muridke",
    khasraNumber: "KH-512/3",
    geoLat: 31.7245,
    geoLng: 73.9912,
    eudrRisk: "LOW",
    hasGps: true,
    deforestationAlerts: 0,
  },
  {
    id: "farm_03",
    farmerId: "f_02",
    name: "Kamoke South Sector",
    areaAcres: 22.0,
    district: "Gujranwala",
    tehsil: "Kamoke",
    khasraNumber: "KH-88/A",
    geoLat: 31.9744,
    geoLng: 74.2231,
    eudrRisk: "LOW",
    hasGps: true,
    deforestationAlerts: 0,
  },
  {
    id: "farm_04",
    farmerId: "f_03",
    name: "Chenab Basin Farm 2",
    areaAcres: 18.5,
    district: "Hafizabad",
    tehsil: "Pindi Bhattian",
    khasraNumber: "KH-1204",
    geoLat: 32.0679,
    geoLng: 73.6983,
    eudrRisk: "LOW",
    hasGps: true,
    deforestationAlerts: 0,
  },
  {
    id: "farm_05",
    farmerId: "f_04",
    name: "Nankana Border Land",
    areaAcres: 30.0,
    district: "Nankana Sahib",
    tehsil: "Sangla Hill",
    khasraNumber: "KH-902",
    geoLat: 31.4501,
    geoLng: 73.7089,
    eudrRisk: "HIGH",
    hasGps: true,
    deforestationAlerts: 3,
  },
];

export const MOCK_FARMERS: MockFarmer[] = [
  {
    id: "f_01",
    name: "Chaudhry Muhammad Ibrahim",
    fatherName: "Haji Abdul Rehman",
    cnic: "3540112345671",
    phone: "03004567891",
    village: "Chak 34-RB",
    district: "Sheikhupura",
    tehsil: "Muridke",
    farmsCount: 2,
    totalLotsCount: 8,
    eudrStatus: "LOW",
    verified: true,
    farms: [MOCK_FARMS[0]!, MOCK_FARMS[1]!],
  },
  {
    id: "f_02",
    name: "Malik Abdul Rasheed",
    fatherName: "Malik Noor Din",
    cnic: "3410198765432",
    phone: "03017894561",
    village: "Mouza Wahndo",
    district: "Gujranwala",
    tehsil: "Kamoke",
    farmsCount: 1,
    totalLotsCount: 5,
    eudrStatus: "LOW",
    verified: true,
    farms: [MOCK_FARMS[2]!],
  },
  {
    id: "f_03",
    name: "Rana Tanveer Hussain",
    fatherName: "Rana Liaquat Ali",
    cnic: "3520287654321",
    phone: "03029871234",
    village: "Kot Sarwar",
    district: "Hafizabad",
    tehsil: "Pindi Bhattian",
    farmsCount: 1,
    totalLotsCount: 4,
    eudrStatus: "LOW",
    verified: true,
    farms: [MOCK_FARMS[3]!],
  },
  {
    id: "f_04",
    name: "Zafar Iqbal Sandhu",
    fatherName: "Muhammad Din Sandhu",
    cnic: "3560176543210",
    phone: "03045551234",
    village: "Chak 12 Sangla",
    district: "Nankana Sahib",
    tehsil: "Sangla Hill",
    farmsCount: 1,
    totalLotsCount: 2,
    eudrStatus: "HIGH",
    verified: false,
    farms: [MOCK_FARMS[4]!],
  },
];

export const MOCK_LOTS: MockLot[] = [
  {
    id: "lot_01",
    lotNumber: "LOT-2024-1115-0042",
    farmerId: "f_01",
    farmerName: "Chaudhry Muhammad Ibrahim",
    farmId: "farm_01",
    farmName: "Chak 34 Dera Field",
    district: "Sheikhupura",
    variety: "BASMATI_1121",
    weightKg: 8500,
    moisturePercentage: 12.8,
    date: "2024-11-15",
    status: "MILLED",
    eudrRisk: "LOW",
    vehicleNumber: "LES-9412",
    pesticides: [{ name: "Cartap Hydrochloride", phiDays: 28 }],
    geoLat: 31.7167,
    geoLng: 73.985,
  },
  {
    id: "lot_02",
    lotNumber: "LOT-2024-1115-0043",
    farmerId: "f_01",
    farmerName: "Chaudhry Muhammad Ibrahim",
    farmId: "farm_02",
    farmName: "Canal Bank Plot A",
    district: "Sheikhupura",
    variety: "BASMATI_1121",
    weightKg: 6200,
    moisturePercentage: 13.1,
    date: "2024-11-15",
    status: "MILLED",
    eudrRisk: "LOW",
    vehicleNumber: "LXM-1882",
    pesticides: [{ name: "Chlorantraniliprole", phiDays: 21 }],
    geoLat: 31.7245,
    geoLng: 73.9912,
  },
  {
    id: "lot_03",
    lotNumber: "LOT-2024-1116-0044",
    farmerId: "f_02",
    farmerName: "Malik Abdul Rasheed",
    farmId: "farm_03",
    farmName: "Kamoke South Sector",
    district: "Gujranwala",
    variety: "BASMATI_1121",
    weightKg: 10400,
    moisturePercentage: 12.5,
    date: "2024-11-16",
    status: "MILLED",
    eudrRisk: "LOW",
    vehicleNumber: "GA-4901",
    pesticides: [{ name: "Buprofezin", phiDays: 30 }],
    geoLat: 31.9744,
    geoLng: 74.2231,
  },
  {
    id: "lot_04",
    lotNumber: "LOT-2024-1118-0045",
    farmerId: "f_03",
    farmerName: "Rana Tanveer Hussain",
    farmId: "farm_04",
    farmName: "Chenab Basin Farm 2",
    district: "Hafizabad",
    variety: "BASMATI_SUPER",
    weightKg: 7800,
    moisturePercentage: 13.0,
    date: "2024-11-18",
    status: "IN_MILLING",
    eudrRisk: "LOW",
    vehicleNumber: "HF-2210",
    pesticides: [{ name: "Hexaconazole", phiDays: 25 }],
    geoLat: 32.0679,
    geoLng: 73.6983,
  },
  {
    id: "lot_05",
    lotNumber: "LOT-2024-1120-0046",
    farmerId: "f_04",
    farmerName: "Zafar Iqbal Sandhu",
    farmId: "farm_05",
    farmName: "Nankana Border Land",
    district: "Nankana Sahib",
    variety: "BASMATI_1121",
    weightKg: 9100,
    moisturePercentage: 14.2,
    date: "2024-11-20",
    status: "RECEIVED",
    eudrRisk: "HIGH",
    vehicleNumber: "NN-7734",
    pesticides: [{ name: "Tricyclazole", phiDays: 14 }],
    geoLat: 31.4501,
    geoLng: 73.7089,
  },
];

export const MOCK_BATCHES: MockBatch[] = [
  {
    id: "batch_01",
    batchNumber: "BATCH-2024-1120-0012",
    variety: "BASMATI_1121",
    paddyInputKg: 25100,
    whiteRiceKg: 16800,
    brokenRiceKg: 2100,
    branKg: 2300,
    yieldPercentage: 66.93,
    status: "COMPLETED",
    startDate: "2024-11-20",
    endDate: "2024-11-21",
    millName: "Unit 1 — Muridke Processing Plant",
    linkedLots: [MOCK_LOTS[0]!, MOCK_LOTS[1]!, MOCK_LOTS[2]!],
  },
  {
    id: "batch_02",
    batchNumber: "BATCH-2024-1122-0013",
    variety: "BASMATI_SUPER",
    paddyInputKg: 18500,
    whiteRiceKg: 12200,
    brokenRiceKg: 1800,
    branKg: 1900,
    yieldPercentage: 65.95,
    status: "IN_PROGRESS",
    startDate: "2024-11-22",
    millName: "Unit 2 — Kamoke Parboiling Facility",
    linkedLots: [MOCK_LOTS[3]!],
  },
];

export const MOCK_LAB_TESTS: MockLabTest[] = [
  {
    id: "lab_01",
    batchId: "batch_01",
    batchNumber: "BATCH-2024-1120-0012",
    testType: "PESTICIDE_RESIDUE",
    labName: "SGS Pakistan (Pvt) Ltd - Lahore",
    testDate: "2024-11-23",
    reportNumber: "SGS-LHR-24-9982",
    result: "PASS",
    parameters: {
      tricyclazole: "< 0.01 mg/kg (MRL: 0.01)",
      carbendazim: "< 0.01 mg/kg (MRL: 0.01)",
      chlorpyrifos: "ND (Not Detected)",
    },
    certificateUrl: "/uploads/certs/sgs_test_9982.pdf",
  },
  {
    id: "lab_02",
    batchId: "batch_01",
    batchNumber: "BATCH-2024-1120-0012",
    testType: "MOISTURE",
    labName: "In-House Quality Laboratory",
    testDate: "2024-11-21",
    reportNumber: "QC-2024-781",
    result: "PASS",
    parameters: {
      averageMoisture: "12.3% (Max limit: 14.0%)",
      purityScore: "98.8%",
    },
  },
];

export const MOCK_SHIPMENTS: MockShipment[] = [
  {
    id: "shp_01",
    shipmentNumber: "SHP-2024-0021",
    invoiceNumber: "INV-EXP-2024-089",
    buyerCompany: "EuroGrain Imports B.V.",
    buyerCountry: "Netherlands (Rotterdam)",
    variety: "BASMATI_1121",
    totalWeightKg: 16800,
    portOfLoading: "Port Muhammad Bin Qasim, Karachi",
    portOfDischarge: "Port of Rotterdam, Netherlands",
    vesselName: "MSC PALOMA / V.448E",
    status: "CERTIFICATE_ISSUED",
    complianceScore: 95,
    complianceStatus: "COMPLIANT",
    certificateNumber: "CERT-2024-0042",
    certificateUrl: "/verify/CERT-2024-0042",
    batches: [MOCK_BATCHES[0]!],
    checklist: [
      { id: "c1", label: "Farm Geolocation (GPS Coordinates on 100% of paddy lots)", passed: true, points: 25 },
      { id: "c2", label: "EUDR Deforestation Risk Assessment (Global Forest Watch)", passed: true, points: 25 },
      { id: "c3", label: "Pesticide Residue Lab Analysis (EU MRL Compliance)", passed: true, points: 20 },
      { id: "c4", label: "Paddy Intake Declarations & PHI Records Complete", passed: true, points: 15 },
      { id: "c5", label: "Operator EUDR Due Diligence Legal Declaration", passed: true, points: 15 },
    ],
  },
  {
    id: "shp_02",
    shipmentNumber: "SHP-2024-0022",
    invoiceNumber: "INV-EXP-2024-094",
    buyerCompany: "Sunrice UK Logistics Ltd",
    buyerCountry: "United Kingdom (Felixstowe)",
    variety: "BASMATI_SUPER",
    totalWeightKg: 24000,
    portOfLoading: "Karachi Port Trust (KPT)",
    portOfDischarge: "Port of Felixstowe, UK",
    vesselName: "CMA CGM JEAN GABRIEL",
    status: "UNDER_REVIEW",
    complianceScore: 75,
    complianceStatus: "AT_RISK",
    batches: [MOCK_BATCHES[1]!],
    checklist: [
      { id: "c1", label: "Farm Geolocation (GPS Coordinates on 100% of paddy lots)", passed: true, points: 25 },
      { id: "c2", label: "EUDR Deforestation Risk Assessment (Global Forest Watch)", passed: true, points: 25 },
      { id: "c3", label: "Pesticide Residue Lab Analysis (EU MRL Compliance)", passed: false, points: 0, detail: "Lab test report pending SGS delivery" },
      { id: "c4", label: "Paddy Intake Declarations & PHI Records Complete", passed: true, points: 15 },
      { id: "c5", label: "Operator EUDR Due Diligence Legal Declaration", passed: true, points: 15 },
    ],
  },
];
