"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "../../../components/layout/AppLayout";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { EudrBadge } from "../../../components/ui/EudrBadge";
import { FarmMap } from "../../../components/maps/FarmMap";
import { MOCK_FARMERS, MOCK_LOTS } from "../../../lib/mock-data";
import { maskCnic, formatWeight } from "../../../lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  PlusCircle,
  MapPin,
  Calendar,
  Wheat,
  TrendingUp,
  FileText,
} from "lucide-react";
import { cn } from "../../../lib/utils";

export default function FarmerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const farmerId = params["id"] as string;

  const farmer = MOCK_FARMERS.find((f) => f.id === farmerId) || MOCK_FARMERS[0]!;
  const [activeTab, setActiveTab] = useState<"farms" | "history" | "stats">("farms");

  const farmerLots = MOCK_LOTS.filter((l) => l.farmerId === farmer.id);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {farmer.name}
              </h1>
              {farmer.verified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  NADRA Verified
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              CNIC: {maskCnic(farmer.cnic)} • District: {farmer.district} • Village: {farmer.village}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("farms")}
            className={cn(
              "pb-3 border-b-2 transition-all cursor-pointer",
              activeTab === "farms"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Registered Fields & Farms ({farmer.farms.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "pb-3 border-b-2 transition-all cursor-pointer",
              activeTab === "history"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Procurement Lots History ({farmerLots.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stats")}
            className={cn(
              "pb-3 border-b-2 transition-all cursor-pointer",
              activeTab === "stats"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Compliance & Stats
          </button>
        </div>

        {/* TAB 1: FARMS */}
        {activeTab === "farms" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Georeferenced Field Plots
                </h3>
                <p className="text-xs text-slate-500">
                  All parcels mapped with GPS polygons for EUDR deforestation verification
                </p>
              </div>
              <Link href="/farms/new">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<PlusCircle className="w-4 h-4" />}
                >
                  Add Field / Farm
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {farmer.farms.map((farm) => (
                <Card key={farm.id} className="p-5 space-y-4 hover:shadow-hover transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        {farm.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Khasra: {farm.khasraNumber} • Tehsil: {farm.tehsil}
                      </p>
                    </div>
                    <EudrBadge risk={farm.eudrRisk} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
                    <div>Area: <span className="font-bold">{farm.areaAcres} Acres</span></div>
                    <div>District: <span className="font-bold">{farm.district}</span></div>
                    <div className="col-span-2 flex items-center gap-1.5 text-emerald-700 font-mono font-medium">
                      <MapPin className="w-3.5 h-3.5" />
                      {farm.geoLat.toFixed(4)}°N, {farm.geoLng.toFixed(4)}°E
                    </div>
                  </div>

                  {/* Leaflet Farm Map Thumbnail */}
                  <FarmMap
                    center={[farm.geoLat, farm.geoLng]}
                    zoom={13}
                    height="180px"
                    markers={[
                      {
                        id: farm.id,
                        lat: farm.geoLat,
                        lng: farm.geoLng,
                        title: farm.name,
                        subtitle: `${farm.areaAcres} Acres • ${farm.khasraNumber}`,
                        eudrRisk: farm.eudrRisk,
                      },
                    ]}
                  />
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: PROCUREMENT HISTORY */}
        {activeTab === "history" && (
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Lot Number</th>
                  <th className="py-3 px-4">Field / Farm</th>
                  <th className="py-3 px-4">Variety</th>
                  <th className="py-3 px-4 text-right">Net Weight</th>
                  <th className="py-3 px-4">Intake Date</th>
                  <th className="py-3 px-4">EUDR Risk</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {farmerLots.map((lot) => (
                  <tr key={lot.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {lot.lotNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{lot.farmName}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {lot.variety.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatWeight(lot.weightKg)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{lot.date}</td>
                    <td className="py-3 px-4">
                      <EudrBadge risk={lot.eudrRisk} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/lots/${lot.id}`}>
                        <Button variant="ghost" size="sm">
                          Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* TAB 3: STATS */}
        {activeTab === "stats" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase">
                Total Paddy Supplied
              </span>
              <div className="text-2xl font-extrabold text-slate-900 mt-2">
                14,700 kg
              </div>
              <p className="text-xs text-emerald-600 font-semibold mt-1">
                Kharif 2024 Season
              </p>
            </Card>
            <Card className="p-5 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase">
                EUDR Compliance Rate
              </span>
              <div className="text-2xl font-extrabold text-emerald-700 mt-2">
                100% LOW RISK
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Zero Deforestation Alerts
              </p>
            </Card>
            <Card className="p-5 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase">
                Pesticide Adherence
              </span>
              <div className="text-2xl font-extrabold text-slate-900 mt-2">
                100% PHI Compliant
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Full Chemical Declarations
              </p>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
