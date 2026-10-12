"use client";

import React from "react";
import Link from "next/link";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ComplianceGauge } from "../../components/ui/ComplianceGauge";
import { MOCK_SHIPMENTS } from "../../lib/mock-data";
import { formatWeight } from "../../lib/utils";
import { Ship, PlusCircle, Eye, FileCheck, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ShipmentsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Export Shipments & Compliance Dossiers
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              EU & International export consignments with automated Article 9 Due Diligence verification
            </p>
          </div>

          <Link href="/shipments/new">
            <Button
              variant="harvest"
              size="md"
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              New Export Consignment
            </Button>
          </Link>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Shipment # / Invoice</th>
                  <th className="py-3 px-4">Buyer Company & Port</th>
                  <th className="py-3 px-4">Rice Variety</th>
                  <th className="py-3 px-4 text-right">Net Weight</th>
                  <th className="py-3 px-4 text-center">Compliance Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Certificate</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_SHIPMENTS.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <div>{s.shipmentNumber}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{s.invoiceNumber}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900">{s.buyerCompany}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{s.portOfDischarge}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {s.variety.replace(/_/g, " ")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                      {formatWeight(s.totalWeightKg)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                          s.complianceScore >= 90
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {s.complianceScore} / 100
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {s.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {s.certificateNumber ? (
                        <Link href={`/verify/${s.certificateNumber}`}>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline">
                            <FileCheck className="w-3.5 h-3.5" />
                            {s.certificateNumber}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-slate-400">Pending Review</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/shipments/${s.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Dossier
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
