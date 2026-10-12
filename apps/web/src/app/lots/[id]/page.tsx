"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "../../../components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { EudrBadge } from "../../../components/ui/EudrBadge";
import { FarmMap } from "../../../components/maps/FarmMap";
import { MOCK_LOTS, MOCK_BATCHES } from "../../../lib/mock-data";
import { formatWeight, formatDate, maskCnic } from "../../../lib/utils";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Truck,
  Droplets,
  Factory,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Share2,
} from "lucide-react";

export default function LotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lotId = params["id"] as string;

  const lot = MOCK_LOTS.find((l) => l.id === lotId) || MOCK_LOTS[0]!;
  const linkedBatch = MOCK_BATCHES.find((b) =>
    b.linkedLots.some((item) => item.id === lot.id)
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Breadcrumb & Actions */}
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
                  {lot.lotNumber}
                </h1>
                <EudrBadge risk={lot.eudrRisk} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Procured on {formatDate(lot.date)} • Vehicle: {lot.vehicleNumber}
              </p>
            </div>
          </div>

          <Button
            variant="harvest"
            size="sm"
            leftIcon={<Share2 className="w-4 h-4" />}
            onClick={() => {
              const text = encodeURIComponent(
                `🌾 RiceTrace Lot ${lot.lotNumber}\nWeight: ${lot.weightKg} kg\nFarmer: ${lot.farmerName}\nVariety: ${lot.variety}\nEUDR: ${lot.eudrRisk}`
              );
              window.open(`https://wa.me/?text=${text}`, "_blank");
            }}
          >
            Share Verification via WhatsApp
          </Button>
        </div>

        {/* Traceability Progression Breadcrumb */}
        <Card className="p-4 bg-gradient-to-r from-emerald-50/50 via-slate-50 to-emerald-50/50 border-emerald-200">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 overflow-x-auto gap-4 py-1">
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">
                1
              </span>
              <div>
                <div className="text-slate-900">Farmer Registered</div>
                <div className="text-[10px] text-slate-500 font-normal">{lot.farmerName}</div>
              </div>
            </div>
            <span className="text-slate-300">→</span>

            <div className="flex items-center gap-2 shrink-0">
              <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">
                2
              </span>
              <div>
                <div className="text-slate-900">Field Geolocation</div>
                <div className="text-[10px] text-slate-500 font-normal">{lot.farmName}</div>
              </div>
            </div>
            <span className="text-slate-300">→</span>

            <div className="flex items-center gap-2 shrink-0">
              <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">
                3
              </span>
              <div>
                <div className="text-slate-900">Paddy Lot Intake</div>
                <div className="text-[10px] text-emerald-700 font-semibold">{lot.lotNumber}</div>
              </div>
            </div>
            <span className="text-slate-300">→</span>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                  linkedBatch ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                4
              </span>
              <div>
                <div className="text-slate-900">Milling Batch</div>
                <div className="text-[10px] text-slate-500 font-normal">
                  {linkedBatch ? linkedBatch.batchNumber : "Pending Milling"}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Farmer & Field Details */}
          <Card className="space-y-4">
            <CardHeader>
              <CardTitle className="text-base">Supplier & Origin Farm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Farmer:</span>
                  <span className="font-extrabold text-slate-900">{lot.farmerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Field Plot:</span>
                  <span className="font-bold text-slate-900">{lot.farmName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">District:</span>
                  <span className="font-semibold text-slate-800">{lot.district}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-500">EUDR Deforestation:</span>
                  <EudrBadge risk={lot.eudrRisk} />
                </div>
              </div>

              {/* Map Preview */}
              <FarmMap
                center={[lot.geoLat, lot.geoLng]}
                zoom={14}
                height="180px"
                markers={[
                  {
                    id: lot.farmId,
                    lat: lot.geoLat,
                    lng: lot.geoLng,
                    title: lot.farmName,
                    subtitle: lot.farmerName,
                    eudrRisk: lot.eudrRisk,
                  },
                ]}
              />
            </CardContent>
          </Card>

          {/* Card 2: Lot Specifications & Chemical Records */}
          <Card className="space-y-4">
            <CardHeader>
              <CardTitle className="text-base">Quality & Chemical Declaration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-400 uppercase text-[10px] font-bold">Rice Variety</div>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {lot.variety.replace(/_/g, " ")}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-400 uppercase text-[10px] font-bold">Net Weight</div>
                  <div className="font-extrabold text-emerald-700 text-sm mt-0.5">
                    {formatWeight(lot.weightKg)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-400 uppercase text-[10px] font-bold">Moisture</div>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {lot.moisturePercentage}% (Standard)
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-400 uppercase text-[10px] font-bold">Vehicle / Trolley</div>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {lot.vehicleNumber}
                  </div>
                </div>
              </div>

              {/* Pesticide Records */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Chemical Spray Records
                </h4>
                {lot.pesticides && lot.pesticides.length > 0 ? (
                  <div className="space-y-2">
                    {lot.pesticides.map((pest, i) => (
                      <div
                        key={i}
                        className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{pest.name}</div>
                          <div className="text-[11px] text-emerald-800">
                            Pre-Harvest Interval (PHI): {pest.phiDays} days observed
                          </div>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                    No chemical sprays recorded (Clean / Organic cultivation).
                  </div>
                )}
              </div>

              {/* Linked Milling Batch */}
              {linkedBatch && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="text-blue-600 font-semibold">Allocated to Milling:</span>
                    <div className="font-extrabold text-slate-900 mt-0.5">
                      {linkedBatch.batchNumber}
                    </div>
                  </div>
                  <Link href={`/milling/${linkedBatch.id}`}>
                    <Button variant="outline" size="sm">
                      View Batch
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
