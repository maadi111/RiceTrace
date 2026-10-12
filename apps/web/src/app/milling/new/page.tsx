"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "../../../components/layout/AppLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { EudrBadge } from "../../../components/ui/EudrBadge";
import { MOCK_LOTS, type MockLot } from "../../../lib/mock-data";
import { formatWeight } from "../../../lib/utils";
import {
  ArrowLeft,
  Factory,
  Plus,
  Trash2,
  CheckCircle2,
  Wheat,
  Calculator,
} from "lucide-react";

export default function NewBatchPage() {
  const router = useRouter();

  const [millName, setMillName] = useState("Unit 1 — Muridke Processing Plant");
  const [variety, setVariety] = useState("BASMATI_1121");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0] || "");

  // Linked lots state
  const [selectedLots, setSelectedLots] = useState<MockLot[]>([MOCK_LOTS[0]!, MOCK_LOTS[1]!]);
  const [lotSearch, setLotSearch] = useState("");

  // Outputs
  const [whiteRiceKg, setWhiteRiceKg] = useState("10200");
  const [brokenKg, setBrokenKg] = useState("1400");
  const [branKg, setBranKg] = useState("1600");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived calculations
  const totalPaddyInputKg = selectedLots.reduce((acc, l) => acc + l.weightKg, 0);
  const whiteKgNum = parseFloat(whiteRiceKg) || 0;
  const yieldPct = totalPaddyInputKg > 0 ? ((whiteKgNum / totalPaddyInputKg) * 100).toFixed(2) : "0.00";

  const availableLots = MOCK_LOTS.filter(
    (l) =>
      !selectedLots.some((sel) => sel.id === l.id) &&
      (l.lotNumber.toLowerCase().includes(lotSearch.toLowerCase()) ||
        l.farmerName.toLowerCase().includes(lotSearch.toLowerCase()))
  );

  const addLot = (lot: MockLot) => {
    setSelectedLots((prev) => [...prev, lot]);
  };

  const removeLot = (id: string) => {
    setSelectedLots((prev) => prev.filter((l) => l.id !== id));
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/milling");
    }, 800);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Create Milling Batch
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Link farm gate paddy lots to milling output and verify traceability recovery
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

        <form onSubmit={handleCreateBatch} className="space-y-6">
          {/* Section 1: Facility & Variety */}
          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. Facility & Variety Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Processing Mill Facility *
                </label>
                <select
                  value={millName}
                  onChange={(e) => setMillName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 font-medium"
                >
                  <option value="Unit 1 — Muridke Processing Plant">Unit 1 — Muridke Processing Plant</option>
                  <option value="Unit 2 — Kamoke Parboiling Facility">Unit 2 — Kamoke Parboiling Facility</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Rice Variety *
                </label>
                <select
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 font-medium"
                >
                  <option value="BASMATI_1121">Basmati 1121 (Kainat)</option>
                  <option value="BASMATI_SUPER">Super Basmati</option>
                  <option value="BASMATI_386">Basmati 386</option>
                  <option value="PARBOILED">Parboiled Rice (Sella)</option>
                </select>
              </div>

              <Input
                label="Milling Run Start Date *"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
          </Card>

          {/* Section 2: Link Lots */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  2. Link Contributing Procurement Lots (Intake Paddy)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select the intake lots to be fed into the hopper for this run:
                </p>
              </div>
              <div className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                Total Input: {formatWeight(totalPaddyInputKg)}
              </div>
            </div>

            {/* Currently Linked Lots Table */}
            {selectedLots.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                {selectedLots.map((lot) => (
                  <div
                    key={lot.id}
                    className="p-3 bg-white flex items-center justify-between hover:bg-slate-50"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-900 mr-2">
                        {lot.lotNumber}
                      </span>
                      <span className="text-slate-600 mr-2">{lot.farmerName}</span>
                      <span className="text-slate-400">({lot.district})</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-extrabold text-slate-900">
                        {formatWeight(lot.weightKg)}
                      </span>
                      <EudrBadge risk={lot.eudrRisk} />
                      <button
                        type="button"
                        onClick={() => removeLot(lot.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-rose-600 bg-rose-50 rounded-xl">
                Please add at least one procurement lot to start a milling run.
              </div>
            )}

            {/* Available Lots to Add */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Search & Add Unlinked Lots:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableLots.slice(0, 4).map((lot) => (
                  <div
                    key={lot.id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-slate-800">
                        {lot.lotNumber}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {lot.farmerName} • {formatWeight(lot.weightKg)}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => addLot(lot)}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Section 3: Recovery Outputs & Yield */}
          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              3. Output Separation & Milling Recovery Yield
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="White / Head Rice Output (KG) *"
                type="number"
                value={whiteRiceKg}
                onChange={(e) => setWhiteRiceKg(e.target.value)}
                required
              />
              <Input
                label="Broken Rice / Tota (KG)"
                type="number"
                value={brokenKg}
                onChange={(e) => setBrokenKg(e.target.value)}
              />
              <Input
                label="Rice Bran / Polish (KG)"
                type="number"
                value={branKg}
                onChange={(e) => setBranKg(e.target.value)}
              />
            </div>

            {/* Auto-calculated yield gauge box */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="w-6 h-6 text-emerald-700" />
                <div>
                  <div className="text-xs font-bold text-emerald-800 uppercase">
                    Auto-Calculated Head Rice Yield
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Standard recovery in Basmati 1121 is between 64% – 68%
                  </div>
                </div>
              </div>
              <div className="text-2xl font-extrabold text-emerald-800 font-mono">
                {yieldPct}%
              </div>
            </div>
          </Card>

          {/* Action buttons */}
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
              Generate Batch & Complete Run
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
