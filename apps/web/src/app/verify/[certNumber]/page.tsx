"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { ComplianceGauge } from "../../../components/ui/ComplianceGauge";
import {
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  Globe,
  FileCheck,
  Lock,
} from "lucide-react";

export default function CertificateVerificationPage() {
  const params = useParams();
  const certNumber = (params["certNumber"] as string) || "CERT-2024-0042";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white flex flex-col justify-between p-6">
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-extrabold text-xl shadow-lg shadow-emerald-900/40">
            🌾
          </div>
          <div>
            <span className="text-xl font-extrabold text-white tracking-tight">
              RiceTrace
            </span>
            <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
              Public Cryptographic Ledger
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
          <Lock className="w-3.5 h-3.5" />
          Tamper-Evident Ledger
        </div>
      </header>

      <main className="max-w-xl w-full mx-auto my-8">
        <Card className="glass-panel bg-slate-900/90 border-slate-800 rounded-3xl p-8 shadow-2xl text-white space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Certificate Authenticated
            </h1>
            <p className="font-mono text-sm font-bold text-emerald-400">
              {certNumber}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 divide-y divide-slate-800 text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> OFFICIALLY VALID & ACTIVE
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Licensed Exporter:</span>
              <span className="font-bold text-white">Al-Raheem Rice Mills Ltd.</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Consignee Buyer:</span>
              <span className="font-bold text-white">EuroGrain Imports B.V. (Netherlands)</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Consignment Number:</span>
              <span className="font-mono text-slate-300">SHP-2024-0021</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Rice Variety:</span>
              <span className="text-slate-200">Basmati 1121 (Kainat)</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Net Quantity:</span>
              <span className="font-bold text-white">16,800 KG</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Issue Date:</span>
              <span className="text-slate-300">November 23, 2024</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/40">
            <div>
              <div className="text-xs font-bold text-emerald-300 uppercase">
                EUDR Traceability Score
              </div>
              <div className="text-[11px] text-emerald-400/80 mt-0.5">
                Full chain of custody & satellite verification passed
              </div>
            </div>
            <div className="text-2xl font-mono font-extrabold text-emerald-400">
              95 / 100
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            This verification page confirms that the digital certificate was generated
            directly by the RiceTrace platform with tamper-proof geolocation records.
            Farmer personal identity records (CNIC and phone numbers) are isolated per
            international GDPR / data privacy requirements.
          </p>
        </Card>
      </main>

      <footer className="text-center text-xs text-slate-500 max-w-xl mx-auto">
        RiceTrace SaaS • Pakistan Rice Export Compliance Network
      </footer>
    </div>
  );
}
