"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "../../../components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { EudrBadge } from "../../../components/ui/EudrBadge";
import { FarmMap } from "../../../components/maps/FarmMap";
import { MOCK_BATCHES, MOCK_LAB_TESTS } from "../../../lib/mock-data";
import { formatWeight, formatDate } from "../../../lib/utils";
import {
  ArrowLeft,
  Factory,
  FlaskConical,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Wheat,
  MapPin,
  FileCheck,
} from "lucide-react";

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params["id"] as string;

  const batch = MOCK_BATCHES.find((b) => b.id === batchId) || MOCK_BATCHES[0]!;
  const batchLabTests = MOCK_LAB_TESTS.filter((t) => t.batchId === batch.id);

  // Collect map markers from all linked lots
  const farmMarkers = batch.linkedLots.map((lot) => ({
    id: lot.farmId,
    lat: lot.geoLat,
    lng: lot.geoLng,
    title: lot.farmName,
    subtitle: `${lot.farmerName} • ${lot.district} (${formatWeight(lot.weightKg)})`,
    eudrRisk: lot.eudrRisk,
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                <h1 className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
                  {batch.batchNumber}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                  Yield: {batch.yieldPercentage}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Facility: {batch.millName} • Variety: {batch.variety.replace(/_/g, " ")} • Started: {batch.startDate}
              </p>
            </div>
          </div>

          <Link href="/lab-tests/new">
            <Button
              variant="harvest"
              size="sm"
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Add Lab Analysis Test
            </Button>
          </Link>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase">Total Paddy Intake</div>
              <div className="text-xl font-extrabold text-slate-900 mt-1">
                {formatWeight(batch.paddyInputKg)}
              </div>
            </div>
            <Wheat className="w-8 h-8 text-emerald-600/40" />
          </Card>

          <Card className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase">White Export Rice</div>
              <div className="text-xl font-extrabold text-emerald-700 mt-1">
                {formatWeight(batch.whiteRiceKg)}
              </div>
            </div>
            <Factory className="w-8 h-8 text-emerald-600/40" />
          </Card>

          <Card className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase">Quality & EUDR Audit</div>
              <div className="text-xl font-extrabold text-emerald-700 mt-1">
                APPROVED
              </div>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-600/40" />
          </Card>
        </div>

        {/* Traceability Map Plotting All Contributing Farms */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Farm Origin Geolocation Plotting ({batch.linkedLots.length} Contributing Farms)
              </CardTitle>
              <p className="text-xs text-slate-500">
                Interactive Leaflet map showing all supplier fields with EUDR satellite risk validation
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-3 h-3 rounded-full bg-emerald-600" /> EUDR Low Risk
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="w-3 h-3 rounded-full bg-rose-600" /> EUDR High Risk
              </span>
            </div>
          </div>

          <FarmMap
            markers={farmMarkers}
            zoom={11}
            height="320px"
          />
        </Card>

        {/* Contributing Lots Table */}
        <Card className="p-0 overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Contributing Farm Gate Intake Lots</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Lot Number</th>
                  <th className="py-3 px-4">Farmer</th>
                  <th className="py-3 px-4">Origin Field</th>
                  <th className="py-3 px-4">District</th>
                  <th className="py-3 px-4 text-right">Paddy Weight</th>
                  <th className="py-3 px-4">EUDR Risk</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batch.linkedLots.map((lot) => (
                  <tr key={lot.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {lot.lotNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {lot.farmerName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{lot.farmName}</td>
                    <td className="py-3 px-4 text-slate-600">{lot.district}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      {formatWeight(lot.weightKg)}
                    </td>
                    <td className="py-3 px-4">
                      <EudrBadge risk={lot.eudrRisk} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/lots/${lot.id}`}>
                        <Button variant="ghost" size="sm">
                          Inspect
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Laboratory Tests */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">SPS Laboratory Certificates</CardTitle>
              <p className="text-xs text-slate-500">
                Certified pesticide residues (MRL), heavy metals, and moisture analysis
              </p>
            </div>
            <Link href="/lab-tests/new">
              <Button variant="outline" size="sm" leftIcon={<FlaskConical className="w-3.5 h-3.5" />}>
                Upload Lab Report
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {batchLabTests.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900">
                    {t.testType.replace(/_/g, " ")}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {t.result}
                  </span>
                </div>
                <div className="text-slate-600">Lab: {t.labName}</div>
                <div className="text-slate-500 font-mono">
                  Report #{t.reportNumber} • Date: {t.testDate}
                </div>
                <div className="pt-2 border-t border-slate-200 text-emerald-800 font-medium">
                  ✓ Residues within EU Regulation 396/2005 Maximum Residue Limits
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
