"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "../../../components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { ComplianceGauge } from "../../../components/ui/ComplianceGauge";
import { EudrBadge } from "../../../components/ui/EudrBadge";
import { MOCK_SHIPMENTS } from "../../../lib/mock-data";
import { formatWeight, formatDate } from "../../../lib/utils";
import {
  ArrowLeft,
  Ship,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Building2,
} from "lucide-react";
import { cn } from "../../../lib/utils";

export default function ShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shipmentId = params["id"] as string;

  const shipment = MOCK_SHIPMENTS.find((s) => s.id === shipmentId) || MOCK_SHIPMENTS[0]!;
  const [expandedCheck, setExpandedCheck] = useState<string | null>("c1");
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);

  const handleGenerateCertificate = () => {
    setIsGeneratingCert(true);
    setTimeout(() => {
      setIsGeneratingCert(false);
      alert("Certificate CERT-2024-0042 has been generated and cryptographically signed!");
    }, 1200);
  };

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
                  {shipment.shipmentNumber}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                  {shipment.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Buyer: {shipment.buyerCompany} • Invoice: {shipment.invoiceNumber} • Destination: {shipment.portOfDischarge}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/verify/${shipment.certificateNumber || "CERT-2024-0042"}`}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<QrCode className="w-4 h-4" />}
              >
                QR Verify Page
              </Button>
            </Link>
            <Button
              variant="harvest"
              size="sm"
              isLoading={isGeneratingCert}
              leftIcon={<FileCheck className="w-4 h-4" />}
              onClick={handleGenerateCertificate}
            >
              Generate Official Certificate
            </Button>
          </div>
        </div>

        {/* Top Summary Card: Compliance Gauge + Commercial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex flex-col items-center justify-center p-6 text-center">
            <ComplianceGauge score={shipment.complianceScore} size={140} strokeWidth={11} />
            <div className="mt-4 text-xs font-semibold text-slate-600">
              Regulation (EU) 2023/1115 Score
            </div>
          </Card>

          <Card className="md:col-span-2 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Consignment Logistics & Vessel Manifest
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Consignee Buyer</div>
                <div className="font-extrabold text-slate-900">{shipment.buyerCompany}</div>
                <div className="text-slate-500">{shipment.buyerCountry}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Net Certified Weight</div>
                <div className="font-extrabold text-emerald-700 text-sm">
                  {formatWeight(shipment.totalWeightKg)}
                </div>
                <div className="text-slate-500">{shipment.variety.replace(/_/g, " ")}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Port of Loading</div>
                <div className="font-semibold text-slate-800">{shipment.portOfLoading}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Vessel / Voyage</div>
                <div className="font-semibold text-slate-800">{shipment.vesselName}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Compliance Checklist Accordion */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Audit Checklist Accordion (EUDR & SPS Pillars)
              </CardTitle>
              <p className="text-xs text-slate-500">
                Click each regulatory check to inspect underlying farm and laboratory evidence
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              {shipment.complianceScore}/100 Verified
            </span>
          </div>

          <div className="space-y-2">
            {shipment.checklist.map((item) => {
              const isOpen = expandedCheck === item.id;
              return (
                <div
                  key={item.id}
                  className="border border-slate-200 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCheck(isOpen ? null : item.id)}
                    className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs font-bold text-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {item.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                      )}
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-emerald-700">
                        +{item.points} pts
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-4 bg-white border-t border-slate-100 text-xs text-slate-600 space-y-2">
                      <p>
                        {item.detail ||
                          "All contributing farm plots verified through high-resolution satellite imagery. Polygons validated against Global Forest Watch Deforestation Alert feeds for post-Dec 31, 2020 land preservation."}
                      </p>
                      <div className="text-[11px] font-semibold text-emerald-700">
                        Status: Audit Requirement Satisfied
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Allocated Batches Table */}
        <Card className="p-0 overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Allocated Milling Batches & Chain of Custody</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Batch Reference</th>
                  <th className="py-3 px-4">Processing Mill</th>
                  <th className="py-3 px-4">Rice Variety</th>
                  <th className="py-3 px-4 text-right">Allocated Net Weight</th>
                  <th className="py-3 px-4">Milling Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipment.batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {b.batchNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{b.millName}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {b.variety.replace(/_/g, " ")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700">
                      {formatWeight(b.whiteRiceKg)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{b.startDate}</td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/milling/${b.id}`}>
                        <Button variant="outline" size="sm">
                          Inspect Batch
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
