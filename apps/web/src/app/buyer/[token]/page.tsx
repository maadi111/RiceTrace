"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { ComplianceGauge } from "../../../components/ui/ComplianceGauge";
import { EudrBadge } from "../../../components/ui/EudrBadge";
import { FarmMap } from "../../../components/maps/FarmMap";
import { MOCK_SHIPMENTS, MOCK_BATCHES } from "../../../lib/mock-data";
import { formatWeight, formatDate } from "../../../lib/utils";
import {
  ShieldCheck,
  Download,
  ExternalLink,
  MapPin,
  CheckCircle2,
  FileCheck,
  Building2,
  Globe,
} from "lucide-react";

export default function BuyerPortalPage() {
  const params = useParams();
  const token = params["token"] as string;

  const shipment = MOCK_SHIPMENTS[0]!;
  const [selectedBatch, setSelectedBatch] = useState(shipment.batches[0] || MOCK_BATCHES[0]!);

  const farmMarkers = selectedBatch.linkedLots.map((lot) => ({
    id: lot.farmId,
    lat: lot.geoLat,
    lng: lot.geoLng,
    title: lot.farmName,
    subtitle: `${lot.district} (${formatWeight(lot.weightKg)})`,
    eudrRisk: lot.eudrRisk,
  }));

  const handleDownloadCertificate = () => {
    alert("Downloading Official 3-Page PDF Traceability Certificate CERT-2024-0042...");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Branded Clean Header for International Buyer */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center font-extrabold text-xl shadow-md">
              🌾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  Al-Raheem Rice Mills Ltd.
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  EUDR VERIFIED EXPORTER
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Official Traceability & Due Diligence Dossier • Powered by RiceTrace
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-slate-900">
              EuroGrain Imports B.V.
            </div>
            <div className="text-[11px] text-slate-500">
              Rotterdam, Netherlands (Authenticated Buyer Session)
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-8">
        {/* Verification Overview Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" />
              Regulation (EU) 2023/1115 (EUDR) Article 9 Certified
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight mt-1">
              Consignment Reference: {shipment.shipmentNumber}
            </h1>
            <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
              Commercial Invoice {shipment.invoiceNumber} • 16,800 kg Basmati 1121 • Destined for Port of Rotterdam.
              All farm gate polygons georeferenced and checked against satellite deforestation alerts.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="harvest"
              size="lg"
              leftIcon={<Download className="w-5 h-5" />}
              onClick={handleDownloadCertificate}
              className="shadow-lg shadow-amber-600/30 font-bold"
            >
              Download PDF Certificate
            </Button>
          </div>
        </div>

        {/* 2-Column Dashboard: Compliance Score + Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Compliance Meter */}
          <Card className="flex flex-col items-center justify-center p-6 text-center">
            <ComplianceGauge score={shipment.complianceScore} size={150} strokeWidth={12} />
            <div className="mt-4 text-xs font-bold text-slate-700 uppercase">
              Overall Traceability Score
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Zero Deforestation Alerts • SGS Passed
            </div>
          </Card>

          {/* Checklist Pillar Verification */}
          <Card className="md:col-span-2 p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Mandatory Regulatory Compliance Pillars
            </h3>

            <div className="space-y-2.5">
              {shipment.checklist.map((chk, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-800">{chk.label}</span>
                  </div>
                  <span className="font-extrabold text-emerald-700">PASS</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Interactive Farm Geolocation Map */}
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Supply Chain Geolocation Map ({farmMarkers.length} Contributing Punjab Farms)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect farm plot coordinates from the Muridke / Kallar rice tract supplying this lot:
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              <MapPin className="w-3.5 h-3.5" />
              100% Polygon GPS Recorded
            </div>
          </div>

          <FarmMap
            markers={farmMarkers}
            zoom={12}
            height="360px"
          />
        </Card>

        {/* Laboratory Analysis Dossier */}
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-extrabold text-slate-900">
            SPS Laboratory Test Analysis & Certificate Verification
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Pesticide Residue Screen</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  PASS (EU MRL)
                </span>
              </div>
              <div className="text-slate-600">Testing Body: SGS Pakistan (Pvt) Ltd</div>
              <div className="text-slate-500 font-mono">Report Number: SGS-LHR-24-9982</div>
              <div className="pt-2 border-t border-slate-200 text-emerald-800 font-medium">
                Tricyclazole & Carbendazim: Below limit of quantification (&lt; 0.01 mg/kg)
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Moisture & Physical Quality</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  PASS
                </span>
              </div>
              <div className="text-slate-600">Average Moisture: 12.3% (Max allowable: 14.0%)</div>
              <div className="text-slate-500">Purity Score: 98.8% pure Basmati 1121</div>
              <div className="pt-2 border-t border-slate-200 text-emerald-800 font-medium">
                Conforms to EU & UK specification standards
              </div>
            </div>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-slate-400">
        <p>
          RiceTrace Cryptographic Ledger • Verification Hash: sha256:4f8e210a99c42...
        </p>
      </footer>
    </div>
  );
}
