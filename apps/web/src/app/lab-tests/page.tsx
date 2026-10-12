"use client";

import React from "react";
import Link from "next/link";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { MOCK_LAB_TESTS } from "../../lib/mock-data";
import { FlaskConical, PlusCircle, CheckCircle2, FileText } from "lucide-react";

export default function LabTestsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Quality & Laboratory Analysis Registry
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Accredited laboratory certificates for Sanitary & Phytosanitary (SPS) compliance
            </p>
          </div>

          <Link href="/lab-tests/new">
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Upload Lab Certificate
            </Button>
          </Link>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Test Analysis Type</th>
                  <th className="py-3 px-4">Associated Batch</th>
                  <th className="py-3 px-4">Testing Laboratory</th>
                  <th className="py-3 px-4">Report / Certificate #</th>
                  <th className="py-3 px-4">Testing Date</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4 text-right">PDF Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_LAB_TESTS.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {t.testType.replace(/_/g, " ")}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-800 font-semibold">
                      {t.batchNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{t.labName}</td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                      {t.reportNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{t.testDate}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {t.result}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<FileText className="w-3.5 h-3.5" />}
                        onClick={() => alert("PDF Certificate preview")}
                      >
                        View PDF
                      </Button>
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
