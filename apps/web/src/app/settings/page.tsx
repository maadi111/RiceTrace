"use client";

import React, { useState } from "react";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
  Building2,
  Users,
  Factory,
  Shield,
  Key,
  PlusCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "../../lib/utils";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"org" | "users" | "mills">("org");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Settings & Organization Administration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage mill profile, multi-user role permissions, and industrial processing units
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("org")}
            className={cn(
              "pb-3 border-b-2 transition-all cursor-pointer",
              activeTab === "org"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Organization Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mills")}
            className={cn(
              "pb-3 border-b-2 transition-all cursor-pointer",
              activeTab === "mills"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Milling Facilities & Units
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={cn(
              "pb-3 border-b-2 transition-all cursor-pointer",
              activeTab === "users"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            User Roles & Staff
          </button>
        </div>

        {/* ORG PROFILE */}
        {activeTab === "org" && (
          <div className="max-w-2xl space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Mill Commercial Credentials
              </h3>

              <Input
                label="Organization / Mill Legal Name"
                defaultValue="Al-Raheem Rice Mills Ltd."
              />
              <Input
                label="Pakistan Rice Exporters Association (PREA) License #"
                defaultValue="PREA-LHR-EXP-2024-0418"
              />
              <Input
                label="FBR National Tax Number (NTN)"
                defaultValue="2981045-8"
              />

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-800 uppercase">
                    Active Subscription Tier
                  </div>
                  <div className="text-lg font-extrabold text-emerald-900 mt-0.5">
                    PROFESSIONAL PLAN
                  </div>
                  <div className="text-xs text-emerald-700">
                    Includes Buyer Portal Magic Links & Unlimited EUDR Satellite Queries
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-extrabold">
                  ACTIVE
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="primary">Save Changes</Button>
              </div>
            </Card>
          </div>
        )}

        {/* MILLS */}
        {activeTab === "mills" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">
                Registered Factory Floor Processing Plants
              </h3>
              <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Add Facility
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Unit 1 — Muridke Processing Plant
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    PRIMARY MILL
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  Address: GT Road, Muridke, Sheikhupura District, Punjab
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  GPS: 31.7167°N, 73.9850°E • License: PREA-0418-A
                </div>
              </Card>

              <Card className="p-5 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Unit 2 — Kamoke Parboiling Facility
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    PARBOIL UNIT
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  Address: Near Railway Crossing, Kamoke, Gujranwala District, Punjab
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  GPS: 31.9744°N, 74.2231°E • License: PREA-0418-B
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === "users" && (
          <Card className="p-0 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase">
                  Staff Role Assignments
                </h4>
                <p className="text-[11px] text-slate-500">
                  Granular permission control matching spec security matrix
                </p>
              </div>
              <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Invite User
              </Button>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role Title</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { name: "Chaudhry Tariq", email: "admin@al-raheem-rice.pk", role: "MILL_ADMIN", lang: "EN" },
                  { name: "Muhammad Rizwan", email: "procurement@al-raheem-rice.pk", role: "PROCUREMENT_OFFICER", lang: "UR" },
                  { name: "Haji Aslam", email: "mill@al-raheem-rice.pk", role: "MILL_MANAGER", lang: "EN" },
                  { name: "Dr. Ayesha Malik", email: "quality@al-raheem-rice.pk", role: "QUALITY_MANAGER", lang: "EN" },
                  { name: "Hamza Farooq", email: "export@al-raheem-rice.pk", role: "EXPORT_MANAGER", lang: "EN" },
                ].map((u, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                        {u.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{u.lang}</td>
                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
