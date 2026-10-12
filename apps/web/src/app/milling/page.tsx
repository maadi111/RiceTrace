"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { MOCK_BATCHES } from "../../lib/mock-data";
import { formatWeight, formatDate } from "../../lib/utils";
import { Factory, PlusCircle, Eye, CheckCircle2, AlertCircle } from "lucide-react";

export default function MillingPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Milling Batches & Processing
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Link paddy lots to industrial milling runs, calculate recovery yield, and prepare for quality audit
            </p>
          </div>

          <Link href="/milling/new">
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              New Milling Batch
            </Button>
          </Link>
        </div>

        {/* Batches Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Milling Plant Facility</th>
                  <th className="py-3 px-4">Rice Variety</th>
                  <th className="py-3 px-4 text-right">Paddy Input</th>
                  <th className="py-3 px-4 text-right">White Rice Output</th>
                  <th className="py-3 px-4 text-center">Milling Yield</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_BATCHES.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {b.batchNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {b.millName}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {b.variety.replace(/_/g, " ")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                      {formatWeight(b.paddyInputKg)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700">
                      {formatWeight(b.whiteRiceKg)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {b.yieldPercentage}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          b.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {b.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/milling/${b.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Trace Batch
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
