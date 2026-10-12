"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { EudrBadge } from "../../components/ui/EudrBadge";
import { MOCK_FARMERS, type MockFarmer } from "../../lib/mock-data";
import { maskCnic } from "../../lib/utils";
import {
  Search,
  UserPlus,
  Filter,
  Eye,
  MapPin,
  CheckCircle2,
  AlertOctagon,
  Users,
} from "lucide-react";

export default function FarmersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [selectedRisk, setSelectedRisk] = useState("ALL");

  const districts = ["ALL", "Sheikhupura", "Gujranwala", "Hafizabad", "Nankana Sahib", "Sialkot"];
  const riskFilters = ["ALL", "LOW", "MEDIUM", "HIGH"];

  const [dbFarmers, setDbFarmers] = useState<any[]>([]);

  React.useEffect(() => {
    async function loadDbFarmers() {
      try {
        const storeRaw = localStorage.getItem("ricetrace-auth-session");
        const token = storeRaw ? JSON.parse(storeRaw)?.state?.accessToken : null;
        const res = await fetch("http://localhost:4000/api/v1/farmers", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            setDbFarmers(json.data);
          }
        }
      } catch {}
    }
    loadDbFarmers();
  }, []);

  const allFarmers = React.useMemo(() => {
    const formattedDb = dbFarmers.map((f) => ({
      id: f.id,
      name: f.name,
      fatherName: f.fatherName || "N/A",
      cnic: f.cnic,
      phone: f.phone || "N/A",
      village: f.village || "N/A",
      district: f.district || "Sheikhupura",
      tehsil: f.tehsil || "Muridke",
      totalAcreage: f.farmsCount ? f.farmsCount * 12.5 : 18.5,
      eudrStatus: "LOW" as const,
      farmsCount: f.farmsCount || 1,
      lotsCount: f.lotsCount || 0,
      verified: true,
    }));
    const nonDuplicatedMocks = MOCK_FARMERS.filter(
      (m) => !formattedDb.some((d) => d.cnic === m.cnic)
    );
    return [...formattedDb, ...nonDuplicatedMocks];
  }, [dbFarmers]);

  const filteredFarmers = allFarmers.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.cnic.includes(searchTerm) ||
      f.village.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDistrict =
      selectedDistrict === "ALL" || f.district === selectedDistrict;

    const matchesRisk =
      selectedRisk === "ALL" || f.eudrStatus === selectedRisk;

    return matchesSearch && matchesDistrict && matchesRisk;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Registered Farmers & Land Holdings
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Farm gate supplier registry with CNIC verification & EUDR polygon records
            </p>
          </div>

          <Link href="/farmers/new">
            <Button
              variant="primary"
              size="md"
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Add New Farmer
            </Button>
          </Link>
        </div>

        {/* Filter Controls */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search CNIC (13 digits), Name, or Village..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>

            {/* District Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 shrink-0">
                District:
              </span>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-600 font-medium"
              >
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d === "ALL" ? "All Districts" : d}
                  </option>
                ))}
              </select>
            </div>

            {/* EUDR Risk Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 shrink-0">
                EUDR Status:
              </span>
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-600 font-medium"
              >
                {riskFilters.map((r) => (
                  <option key={r} value={r}>
                    {r === "ALL" ? "All EUDR Tiers" : `EUDR ${r}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Farmer Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Farmer Name & Village</th>
                  <th className="py-3 px-4">CNIC (Masked)</th>
                  <th className="py-3 px-4">District / Tehsil</th>
                  <th className="py-3 px-4 text-center">Farms</th>
                  <th className="py-3 px-4 text-center">Intake Lots</th>
                  <th className="py-3 px-4">EUDR Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFarmers.map((f) => (
                  <tr
                    key={f.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 group-hover:text-emerald-700">
                          {f.name}
                        </span>
                        {f.verified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Village: {f.village} • S/O {f.fatherName}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {maskCnic(f.cnic)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {f.district}, {f.tehsil}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700">
                        {f.farmsCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold">
                        {f.totalLotsCount} lots
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <EudrBadge risk={f.eudrStatus} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/farmers/${f.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Profile
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
