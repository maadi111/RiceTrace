"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "../../../components/layout/AppLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { ComplianceGauge } from "../../../components/ui/ComplianceGauge";
import { MOCK_BATCHES } from "../../../lib/mock-data";
import { formatWeight } from "../../../lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Ship,
  CheckCircle2,
  FileCheck,
  Plus,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { cn } from "../../../lib/utils";

export default function NewShipmentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Buyer Info
  const [buyerCompany, setBuyerCompany] = useState("EuroGrain Imports B.V.");
  const [buyerCountry, setBuyerCountry] = useState("Netherlands");

  // Shipment Details
  const [invoiceNumber, setInvoiceNumber] = useState("INV-EXP-2024-099");
  const [variety, setVariety] = useState("BASMATI_1121");
  const [portLoading, setPortLoading] = useState("Port Qasim, Karachi");
  const [portDischarge, setPortDischarge] = useState("Rotterdam, Netherlands");
  const [vesselName, setVesselName] = useState("MSC LORETTA / V.502");
  const [lcNumber, setLcNumber] = useState("LC-990184-PK");

  // Batches
  const [selectedBatches, setSelectedBatches] = useState([MOCK_BATCHES[0]!]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalNetWeight = selectedBatches.reduce((acc, b) => acc + b.whiteRiceKg, 0);

  const liveChecks = [
    { label: "100% contributing lots have GPS geolocation", passed: true, points: 25 },
    { label: "EUDR Deforestation check completed on all farm polygons", passed: true, points: 25 },
    { label: "Accredited SPS pesticide multiresidue analysis PASS", passed: true, points: 20 },
    { label: "Field pesticide intake declarations complete", passed: true, points: 15 },
    { label: "Operator Article 4 due diligence statement confirmed", passed: true, points: 15 },
  ];

  const liveScore = liveChecks.reduce((acc, c) => acc + (c.passed ? c.points : 0), 0);

  const handleFinish = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/shipments");
    }, 800);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              New Export Consignment Dossier
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Step {step} of 4 — Assemble milling batches, evaluate compliance score, and issue certificate
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Cancel
          </Button>
        </div>

        {/* Wizard progress tabs */}
        <div className="grid grid-cols-4 gap-2">
          {["1. Buyer", "2. Shipping", "3. Batches", "4. Compliance"].map((lbl, idx) => (
            <div
              key={idx}
              className={cn(
                "py-2 px-3 rounded-xl text-xs font-bold text-center border transition-all",
                step === idx + 1
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                  : step > idx + 1
                  ? "border-slate-200 bg-slate-100 text-slate-500"
                  : "border-slate-100 bg-white text-slate-400"
              )}
            >
              {lbl}
            </div>
          ))}
        </div>

        {/* STEP 1: BUYER */}
        {step === 1 && (
          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. International Buyer / Consignee
            </h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Select Registered Buyer *
              </label>
              <select
                value={buyerCompany}
                onChange={(e) => setBuyerCompany(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 font-medium"
              >
                <option value="EuroGrain Imports B.V.">EuroGrain Imports B.V. (Netherlands)</option>
                <option value="Sunrice UK Logistics Ltd">Sunrice UK Logistics Ltd (United Kingdom)</option>
                <option value="Al-Dhiyafa Foods Dubai">Al-Dhiyafa Foods Dubai (UAE)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Destination Country"
                value={buyerCountry}
                onChange={(e) => setBuyerCountry(e.target.value)}
              />
              <Input
                label="Destination Port"
                value={portDischarge}
                onChange={(e) => setPortDischarge(e.target.value)}
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                variant="primary"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => setStep(2)}
              >
                Continue to Shipping Details
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 2: SHIPPING DETAILS */}
        {step === 2 && (
          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              2. Commercial Invoice & Carrier Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Commercial Invoice Number *"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required
              />
              <Input
                label="Letter of Credit (L/C) #"
                value={lcNumber}
                onChange={(e) => setLcNumber(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Port of Loading (Pakistan) *"
                value={portLoading}
                onChange={(e) => setPortLoading(e.target.value)}
                required
              />
              <Input
                label="Vessel / Carrier Name"
                value={vesselName}
                onChange={(e) => setVesselName(e.target.value)}
              />
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)}>
                Allocate Milling Batches
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 3: ALLOCATE BATCHES */}
        {step === 3 && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  3. Select Completed Milling Batches
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allocate finished white rice stock to this export bill:
                </p>
              </div>
              <div className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                Total Weight: {formatWeight(totalNetWeight)}
              </div>
            </div>

            <div className="space-y-3">
              {MOCK_BATCHES.map((b) => {
                const isSelected = selectedBatches.some((s) => s.id === b.id);
                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedBatches((prev) => prev.filter((x) => x.id !== b.id));
                      } else {
                        setSelectedBatches((prev) => [...prev, b]);
                      }
                    }}
                    className={cn(
                      "p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between",
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/70 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div>
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {b.batchNumber}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {b.millName} • {b.variety.replace(/_/g, " ")} • Yield: {b.yieldPercentage}%
                      </div>
                      <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                        ✓ {b.linkedLots.length} Geotagged Intake Lots Linked
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900">
                        {formatWeight(b.whiteRiceKg)}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                        {isSelected ? "ALLOCATED" : "AVAILABLE"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(4)}>
                Live Compliance Review
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 4: LIVE COMPLIANCE REVIEW */}
        {step === 4 && (
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Automated Pre-Shipment Compliance Assessment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evaluated against Regulation (EU) 2023/1115 & EU MRL Regulations
                </p>
              </div>
              <ComplianceGauge score={liveScore} size={100} strokeWidth={8} />
            </div>

            <div className="space-y-2.5">
              {liveChecks.map((chk, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-800">{chk.label}</span>
                  </div>
                  <span className="font-bold text-emerald-700">+{chk.points} pts</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold">Ready for Certificate Issuance</div>
                <div>
                  This consignment meets 100% of EUDR Article 9 due diligence requirements.
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                rightIcon={<FileCheck className="w-4 h-4" />}
                onClick={handleFinish}
              >
                Create Consignment & Issue Certificate
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
