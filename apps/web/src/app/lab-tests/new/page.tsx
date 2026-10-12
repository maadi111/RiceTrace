"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "../../../components/layout/AppLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { MOCK_BATCHES } from "../../../lib/mock-data";
import {
  ArrowLeft,
  FlaskConical,
  Upload,
  CheckCircle2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../../../lib/utils";

export default function AddLabTestPage() {
  const router = useRouter();

  const [batchId, setBatchId] = useState(MOCK_BATCHES[0]?.id || "");
  const [testType, setTestType] = useState("PESTICIDE_RESIDUE");
  const [labName, setLabName] = useState("SGS Pakistan (Pvt) Ltd");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0] || "");
  const [reportNumber, setReportNumber] = useState("SGS-LHR-24-9982");
  const [result, setResult] = useState<"PASS" | "FAIL" | "CONDITIONAL">("PASS");

  // Dynamic parameter fields
  const [tricyclazole, setTricyclazole] = useState("< 0.01 mg/kg");
  const [carbendazim, setCarbendazim] = useState("< 0.01 mg/kg");
  const [moisture, setMoisture] = useState("12.4%");
  const [pdfAttached, setPdfAttached] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/lab-tests");
    }, 800);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Log Lab Analysis & Upload Certificate
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              EU & UK Maximum Residue Limits (MRL) and physical quality inspection verification
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. Sample Batch & Laboratory Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Target Milling Batch *
                </label>
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 font-medium"
                >
                  {MOCK_BATCHES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber} — {b.variety.replace(/_/g, " ")} ({b.whiteRiceKg} kg)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Testing Protocol / Type *
                </label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 font-medium"
                >
                  <option value="PESTICIDE_RESIDUE">Pesticide Residue (EU Multiresidue Screen)</option>
                  <option value="MOISTURE">Moisture & Physical Grain Quality</option>
                  <option value="HEAVY_METALS">Heavy Metals (Lead, Cadmium, Arsenic)</option>
                  <option value="FULL_PANEL">Full Export Panel (EU Comprehensive)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Accredited Lab *
                </label>
                <select
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 font-medium"
                >
                  <option value="SGS Pakistan (Pvt) Ltd">SGS Pakistan (Pvt) Ltd</option>
                  <option value="Eurofins Scientific">Eurofins Scientific</option>
                  <option value="PCSIR Laboratories Lahore">PCSIR Laboratories Lahore</option>
                  <option value="In-House Mill Lab">In-House Mill Quality Lab</option>
                </select>
              </div>

              <Input
                label="Report Number *"
                value={reportNumber}
                onChange={(e) => setReportNumber(e.target.value)}
                placeholder="SGS-LHR-24-9982"
                required
              />

              <Input
                label="Test Date *"
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                required
              />
            </div>
          </Card>

          {/* Section 2: Dynamic Lab Results */}
          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              2. Chemical & Physical Parameter Outcomes
            </h3>

            {testType === "PESTICIDE_RESIDUE" || testType === "FULL_PANEL" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Tricyclazole (EU MRL: 0.01 mg/kg)"
                  value={tricyclazole}
                  onChange={(e) => setTricyclazole(e.target.value)}
                  placeholder="< 0.01 mg/kg (Pass)"
                />
                <Input
                  label="Carbendazim (EU MRL: 0.01 mg/kg)"
                  value={carbendazim}
                  onChange={(e) => setCarbendazim(e.target.value)}
                  placeholder="< 0.01 mg/kg (Pass)"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Moisture % (Max 14.0%)"
                  value={moisture}
                  onChange={(e) => setMoisture(e.target.value)}
                  placeholder="12.4%"
                />
                <Input
                  label="Purity Index %"
                  defaultValue="99.2%"
                  placeholder="99.2%"
                />
              </div>
            )}

            {/* Overall Result Radio Selector */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Official Compliance Result *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "PASS", label: "PASS (Compliant)", color: "border-emerald-600 bg-emerald-600 text-white" },
                  { id: "CONDITIONAL", label: "CONDITIONAL (Review)", color: "border-amber-600 bg-amber-600 text-white" },
                  { id: "FAIL", label: "FAIL (Rejected)", color: "border-rose-600 bg-rose-600 text-white" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setResult(item.id as any)}
                    className={cn(
                      "py-3 rounded-xl font-bold text-xs border text-center transition-all",
                      result === item.id
                        ? item.color
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Section 3: Upload Certificate PDF */}
          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              3. Laboratory Certificate PDF Attachment
            </h3>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50">
              <FileText className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-bold text-xs text-slate-800">
                Attach Official PDF Signed Lab Certificate
              </h4>
              <p className="text-[10px] text-slate-400 mt-1">
                Required for export clearance document dossier
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setPdfAttached(true)}
              >
                {pdfAttached ? "✓ Lab Certificate PDF Attached" : "Upload PDF Report"}
              </Button>
            </div>
          </Card>

          <div className="flex justify-between items-center pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              rightIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Save Laboratory Record
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
