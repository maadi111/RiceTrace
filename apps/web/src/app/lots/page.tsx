"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EudrBadge } from "../../components/ui/EudrBadge";
import { MOCK_LOTS } from "../../lib/mock-data";
import { formatWeight, formatDate } from "../../lib/utils";
import {
  Wheat,
  PlusCircle,
  Search,
  Filter,
  Eye,
  Calendar,
  Truck,
  Droplets,
  ShieldCheck,
} from "lucide-react";

export default function LotsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVariety, setSelectedVariety] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const varieties = ["ALL", "BASMATI_1121", "BASMATI_SUPER", "BASMATI_386"];
  const statuses = ["ALL", "RECEIVED", "IN_MILLING", "MILLED"];

  const filteredLots = MOCK_LOTS.filter((l) => {
    const matchesSearch =
      l.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVariety =
      selectedVariety === "ALL" || l.variety === selectedVariety;

    const matchesStatus =
      selectedStatus === "ALL" || l.status === selectedStatus;

    return matchesSearch && matchesVariety && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Paddy Procurement Lots
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Farm gate intakes with digital weighment, GPS origin, and pesticide tracking
            </p>
          </div>

          <Link href="/lots/new">
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              New Lot Entry (Field Wizard)
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search Lot#, Farmer, Vehicle, District..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 shrink-0">
                Variety:
              </span>
              <select
                value={selectedVariety}
                onChange={(e) => setSelectedVariety(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-600 font-medium"
              >
                {varieties.map((v) => (
                  <option key={v} value={v}>
                    {v === "ALL" ? "All Varieties" : v.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 shrink-0">
                Status:
              </span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-600 font-medium"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s === "ALL" ? "All Statuses" : s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Lots Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Lot Reference</th>
                  <th className="py-3 px-4">Farmer & Origin Field</th>
                  <th className="py-3 px-4">Rice Variety</th>
                  <th className="py-3 px-4 text-right">Net Weight</th>
                  <th className="py-3 px-4">Moisture</th>
                  <th className="py-3 px-4">Intake Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">EUDR Flag</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLots.map((lot) => (
                  <tr
                    key={lot.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 group-hover:text-emerald-700">
                      {lot.lotNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900">
                        {lot.farmerName}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {lot.farmName} • {lot.district}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {lot.variety.replace(/_/g, " ")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                      {formatWeight(lot.weightKg)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {lot.moisturePercentage}%
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {formatDate(lot.date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {lot.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <EudrBadge risk={lot.eudrRisk} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/lots/${lot.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Trace
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
