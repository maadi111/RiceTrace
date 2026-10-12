"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  ClipboardCheck,
  Factory,
  FlaskConical,
  Ship,
  Settings,
  ChevronDown,
  Leaf,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../store/auth.store";
import { useI18nStore } from "../../store/i18n.store";
import type { UserRole } from "@ricetrace/types";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, loginAsDemoRole } = useAuthStore();
  const { language } = useI18nStore();
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    farmers: true,
    procurement: true,
    milling: true,
    quality: true,
    export: true,
    settings: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const allRoles: { role: UserRole; title: string }[] = [
    { role: "MILL_ADMIN", title: "Mill Admin (Owner / GM)" },
    { role: "PROCUREMENT_OFFICER", title: "Procurement Officer (Field)" },
    { role: "MILL_MANAGER", title: "Mill Manager (Floor)" },
    { role: "QUALITY_MANAGER", title: "Quality Manager (QC / Lab)" },
    { role: "EXPORT_MANAGER", title: "Export Manager (Trade)" },
  ];

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col w-64 h-screen fixed inset-y-0 left-0 bg-[#0f172a] text-slate-200 z-30 select-none border-r border-slate-800/80 shadow-lg",
        language === "UR" && "font-arabic"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/60">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
          <Leaf className="w-5 h-5 text-emerald-400 fill-emerald-400" />
        </div>
        <div>
          <div className="font-bold text-lg text-white tracking-tight leading-none">
            RiceTrace
          </div>
          <p className="text-[10px] text-slate-400 tracking-tight leading-none mt-1">
            Traceability for a Sustainable Future
          </p>
        </div>
      </div>

      {/* Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin">
        {/* Dashboard Link */}
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all mb-2",
            pathname === "/dashboard"
              ? "bg-[#143739] text-[#4ade80] font-semibold shadow-inner"
              : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
          )}
        >
          <Home className="w-4 h-4 text-emerald-400" />
          <span>Dashboard</span>
        </Link>

        {/* Farmers Group */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => toggleSection("farmers")}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-slate-400" />
              <span>Farmers</span>
            </div>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                openSections.farmers ? "rotate-0" : "-rotate-90"
              )}
            />
          </button>
          {openSections.farmers && (
            <div className="pl-10 pr-2 py-0.5 space-y-0.5 text-xs">
              <Link
                href="/farmers"
                className={cn(
                  "block py-1 px-2 rounded-md transition-colors",
                  pathname === "/farmers"
                    ? "text-emerald-400 font-medium bg-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                Farmer List
              </Link>
              <Link
                href="/farmers/new"
                className={cn(
                  "block py-1 px-2 rounded-md transition-colors",
                  pathname === "/farmers/new"
                    ? "text-emerald-400 font-medium bg-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                Add Farmer
              </Link>
              <Link
                href="/farms/new"
                className={cn(
                  "block py-1 px-2 rounded-md transition-colors",
                  pathname === "/farms/new"
                    ? "text-emerald-400 font-medium bg-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                Farm Registry
              </Link>
            </div>
          )}
        </div>

        {/* Procurement Group */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => toggleSection("procurement")}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-4 h-4 text-slate-400" />
              <span>Procurement</span>
            </div>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                openSections.procurement ? "rotate-0" : "-rotate-90"
              )}
            />
          </button>
          {openSections.procurement && (
            <div className="pl-10 pr-2 py-0.5 space-y-0.5 text-xs">
              <Link
                href="/lots"
                className={cn(
                  "block py-1 px-2 rounded-md transition-colors",
                  pathname === "/lots"
                    ? "text-emerald-400 font-medium bg-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                Lot List
              </Link>
              <Link
                href="/lots/new"
                className={cn(
                  "block py-1 px-2 rounded-md transition-colors",
                  pathname === "/lots/new"
                    ? "text-emerald-400 font-medium bg-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                New Lot Entry
              </Link>
            </div>
          )}
        </div>

        {/* Milling Group */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => toggleSection("milling")}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Factory className="w-4 h-4 text-slate-400" />
              <span>Milling</span>
            </div>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                openSections.milling ? "rotate-0" : "-rotate-90"
              )}
            />
          </button>
          {openSections.milling && (
            <div className="pl-10 pr-2 py-0.5 space-y-0.5 text-xs">
              <Link
                href="/milling"
                className={cn(
                  "block py-1 px-2 rounded-md transition-colors",
                  pathname === "/milling"
                    ? "text-emerald-400 font-medium bg-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                Batch List
              </Link>
              <Link
                href="/milling/new"
                className={cn(
                  "block py-1 px-2 rounded-md transition-colors",
                  pathname === "/milling/new"
                    ? "text-emerald-400 font-medium bg-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                New Batch
              </Link>
            </div>
          )}
        </div>

        {/* Quality & Lab Group */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => toggleSection("quality")}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FlaskConical className="w-4 h-4 text-slate-400" />
              <span>Quality & Lab</span>
            </div>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                openSections.quality ? "rotate-0" : "-rotate-90"
              )}
            />
          </button>
          {openSections.quality && (
            <div className="pl-10 pr-2 py-0.5 space-y-0.5 text-xs">
              <Link
                href="/lab-tests"
                className={cn(
                  "block py-1 px-2 rounded-md transition-colors",
                  pathname === "/lab-tests"
                    ? "text-emerald-400 font-medium bg-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                Lab Tests
              </Link>
              <Link
                href="/lab-tests/new"
                className={cn(
                  "block py-1 px-2 rounded-md transition-colors",
                  pathname === "/lab-tests/new"
                    ? "text-emerald-400 font-medium bg-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                Upload Certificate
              </Link>
            </div>
          )}
        </div>

        {/* Export Group */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => toggleSection("export")}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Ship className="w-4 h-4 text-slate-400" />
              <span>Export</span>
            </div>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                openSections.export ? "rotate-0" : "-rotate-90"
              )}
            />
          </button>
          {openSections.export && (
            <div className="pl-10 pr-2 py-0.5 space-y-0.5 text-xs">
              <Link
                href="/shipments"
                className={cn(
                  "block py-1 px-2 rounded-md transition-colors",
                  pathname === "/shipments"
                    ? "text-emerald-400 font-medium bg-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                Shipments
              </Link>
              <Link
                href="/buyers"
                className={cn(
                  "block py-1 px-2 rounded-md transition-colors",
                  pathname === "/buyers"
                    ? "text-emerald-400 font-medium bg-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                Buyers
              </Link>
              <Link
                href="/verify/CERT-2024-0042"
                className={cn(
                  "block py-1 px-2 rounded-md transition-colors",
                  pathname === "/verify/CERT-2024-0042"
                    ? "text-emerald-400 font-medium bg-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                Certificates
              </Link>
            </div>
          )}
        </div>

        {/* Settings Group */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => toggleSection("settings")}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Settings</span>
            </div>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                openSections.settings ? "rotate-0" : "-rotate-90"
              )}
            />
          </button>
          {openSections.settings && (
            <div className="pl-10 pr-2 py-0.5 space-y-0.5 text-xs">
              <Link
                href="/settings?tab=users"
                className={cn(
                  "block py-1 px-2 rounded-md transition-colors",
                  pathname.includes("users")
                    ? "text-emerald-400 font-medium bg-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                Users
              </Link>
              <Link
                href="/settings?tab=mills"
                className={cn(
                  "block py-1 px-2 rounded-md transition-colors",
                  pathname.includes("mills")
                    ? "text-emerald-400 font-medium bg-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                Mills
              </Link>
              <Link
                href="/settings?tab=org"
                className={cn(
                  "block py-1 px-2 rounded-md transition-colors",
                  pathname.includes("org")
                    ? "text-emerald-400 font-medium bg-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                Organization
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Role Switcher popup / Simulator button */}
      <div className="px-3 py-2 border-t border-slate-800/60 bg-slate-950/40 relative">
        <button
          type="button"
          onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-300 text-[11px] font-medium transition-colors"
        >
          <span>Simulate Persona</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {roleSwitcherOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 p-1 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-50 space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Role Switch
            </div>
            {allRoles.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => {
                  loginAsDemoRole(r.role);
                  setRoleSwitcherOpen(false);
                }}
                className={cn(
                  "w-full text-left px-2 py-1 rounded-md text-xs font-medium transition-colors flex items-center justify-between",
                  user?.role === r.role
                    ? "bg-emerald-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                )}
              >
                <span>{r.title}</span>
                {user?.role === r.role && <CheckCircle2 className="w-3 h-3" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Rice Paddy Field Landscape Photo Banner */}
      <div className="relative w-full h-36 overflow-hidden shrink-0 mt-auto">
        <img
          src="/sidebar-rice-fields.jpg"
          alt="Lush green rice paddy fields"
          className="w-full h-full object-cover object-bottom"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#0f172a]/30 to-[#0f172a]" />
      </div>
    </aside>
  );
}
