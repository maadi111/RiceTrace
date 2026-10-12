"use client";

import React, { useState } from "react";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
  Ship,
  Link as LinkIcon,
  Copy,
  Check,
  PlusCircle,
  ExternalLink,
  Mail,
  Building2,
} from "lucide-react";

interface BuyerItem {
  id: string;
  companyName: string;
  country: string;
  contactName: string;
  contactEmail: string;
  magicToken: string;
  tokenExpiresAt: string;
  shipmentsCount: number;
}

export default function BuyersPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const buyers: BuyerItem[] = [
    {
      id: "b_01",
      companyName: "EuroGrain Imports B.V.",
      country: "Netherlands (Rotterdam)",
      contactName: "Pieter van de Berg",
      contactEmail: "p.vandeberg@eurograin.nl",
      magicToken: "tk_eurograin_demo_9921",
      tokenExpiresAt: "90 days remaining",
      shipmentsCount: 3,
    },
    {
      id: "b_02",
      companyName: "Sunrice UK Logistics Ltd",
      country: "United Kingdom (Felixstowe)",
      contactName: "Arthur Pendelton",
      contactEmail: "arthur@sunrice-uk.co.uk",
      magicToken: "tk_sunrice_demo_8832",
      tokenExpiresAt: "65 days remaining",
      shipmentsCount: 2,
    },
    {
      id: "b_03",
      companyName: "Al-Dhiyafa Foods Trading",
      country: "United Arab Emirates (Jebel Ali)",
      contactName: "Rashid Al-Maktoum",
      contactEmail: "procurement@aldhiyafa.ae",
      magicToken: "tk_aldhiyafa_demo_7714",
      tokenExpiresAt: "88 days remaining",
      shipmentsCount: 5,
    },
  ];

  const handleCopyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/buyer/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              International Buyers & Magic Link Portal Access
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Provide European and overseas importers zero-friction read-only access to verify EUDR compliance
            </p>
          </div>

          <Button
            variant="harvest"
            size="md"
            leftIcon={<PlusCircle className="w-4 h-4" />}
            onClick={() => alert("Add Buyer dialog ready")}
          >
            Add New Buyer
          </Button>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Buyer Company & Country</th>
                  <th className="py-3 px-4">Contact Officer</th>
                  <th className="py-3 px-4 text-center">Active Shipments</th>
                  <th className="py-3 px-4">Magic Link Access Token</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {buyers.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-sm">
                        {b.companyName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{b.country}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{b.contactName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{b.contactEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold">
                        {b.shipmentsCount} Consignments
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {b.magicToken.slice(0, 16)}...
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(b.magicToken, b.id)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Copy full magic link URL"
                        >
                          {copiedId === b.id ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium">
                        {b.tokenExpiresAt}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <a
                        href={`/buyer/${b.magicToken}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                        >
                          Open Portal
                        </Button>
                      </a>
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
