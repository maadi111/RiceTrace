"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppLayout } from "../../components/layout/AppLayout";
import { useAuthStore } from "../../store/auth.store";
import { WeatherCalendarWidget } from "../../components/dashboard/WeatherCalendarWidget";
import {
  Calendar,
  CloudSun,
  AlertTriangle,
  ArrowRight,
  X,
  Leaf,
  Layers,
  FlaskConical,
  Ship,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  FileText,
  UserCheck,
  Award,
  Truck,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { FarmMap } from "../../components/maps/FarmMap";
import { cn } from "../../lib/utils";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState("Current Season");

  // Procurement volume weekly data (out of 200k max)
  const weeklyData = [
    { week: "W1", kg: 92000, height: "46%" },
    { week: "W2", kg: 114000, height: "57%" },
    { week: "W3", kg: 132000, height: "66%" },
    { week: "W4", kg: 148000, height: "74%" },
    { week: "W5", kg: 178000, height: "89%" },
    { week: "W6", kg: 135000, height: "68%" },
    { week: "W7", kg: 142000, height: "71%" },
    { week: "W8", kg: 105000, height: "52%" },
  ];

  // Top 5 Districts
  const districts = [
    { name: "Sialkot", volume: "1.2M", percent: 100 },
    { name: "Gujrat", volume: "980K", percent: 82 },
    { name: "Sheikhupura", volume: "760K", percent: 63 },
    { name: "Lahore", volume: "610K", percent: 51 },
    { name: "Kasur", volume: "540K", percent: 45 },
  ];

  // Procurement Officer Activity
  const officers = [
    { name: "Ahmed", count: 18, height: "60%" },
    { name: "Zara", count: 14, height: "46%" },
    { name: "Usman", count: 11, height: "36%" },
    { name: "Ayesha", count: 9, height: "30%" },
    { name: "Bilal", count: 6, height: "20%" },
  ];

  // Pipeline shipment stages
  const shipmentStages = [
    { label: "Draft", count: 12, icon: FileText, color: "bg-slate-100 text-slate-600" },
    { label: "Under Review", count: 8, icon: UserCheck, color: "bg-blue-100 text-blue-600" },
    { label: "Certificate Issued", count: 10, icon: Award, color: "bg-purple-100 text-purple-600" },
    { label: "Shipped", count: 6, icon: Truck, color: "bg-emerald-100 text-emerald-600" },
    { label: "Delivered", count: 2, icon: CheckCircle2, color: "bg-green-100 text-green-600" },
  ];

  // Farm Map markers for Pakistan rice belt
  const mapMarkers = [
    { id: "m1", lat: 31.7167, lng: 73.985, title: "Muridke Plot 14", subtitle: "Basmati Super", eudrRisk: "LOW" as const },
    { id: "m2", lat: 31.713, lng: 73.978, title: "Muridke Plot 15", subtitle: "Basmati 1121", eudrRisk: "LOW" as const },
    { id: "m3", lat: 31.714, lng: 73.992, title: "Muridke Plot 16", subtitle: "Basmati 386", eudrRisk: "LOW" as const },
    { id: "m4", lat: 31.711, lng: 73.982, title: "Muridke South", subtitle: "Basmati Super", eudrRisk: "LOW" as const },
    { id: "m5", lat: 31.57, lng: 74.31, title: "Lahore North", subtitle: "Basmati 1121", eudrRisk: "LOW" as const },
    { id: "m6", lat: 32.16, lng: 74.18, title: "Gujranwala East", subtitle: "Parboiled", eudrRisk: "MEDIUM" as const },
    { id: "m7", lat: 32.49, lng: 74.53, title: "Sialkot Border Farm", subtitle: "Basmati 1121", eudrRisk: "MEDIUM" as const },
    { id: "m8", lat: 31.25, lng: 74.45, title: "Kasur Canal Plot", subtitle: "Basmati 386", eudrRisk: "HIGH" as const },
    { id: "m9", lat: 31.82, lng: 73.48, title: "Hafizabad Plot 9", subtitle: "Basmati Super", eudrRisk: "HIGH" as const },
    { id: "m10", lat: 31.45, lng: 73.71, title: "Nankana Sahib River Field", subtitle: "Basmati 1121", eudrRisk: "HIGH" as const },
  ];

  // Recent activity stream
  const recentActivities = [
    {
      id: "a1",
      icon: "lot",
      title: "New lot entry #L-0076 added",
      actor: "by Ahmed Khan",
      time: "12 min ago",
      iconBg: "bg-emerald-100 text-emerald-600",
    },
    {
      id: "a2",
      icon: "lab",
      title: "Lab test completed (Pass)",
      actor: "by Dr. Sara Ahmed",
      time: "18 min ago",
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      id: "a3",
      icon: "batch",
      title: "Batch B-017 moved to Milling",
      actor: "by Usman Ali",
      time: "32 min ago",
      iconBg: "bg-purple-100 text-purple-600",
    },
    {
      id: "a4",
      icon: "shipment",
      title: "Shipment SH-0067 created",
      actor: "by Ayesha Malik",
      time: "1 hour ago",
      iconBg: "bg-teal-100 text-teal-600",
    },
    {
      id: "a5",
      icon: "cert",
      title: "Certificate CERT-0045 issued",
      actor: "by Bilal Hussain",
      time: "2 hours ago",
      iconBg: "bg-indigo-100 text-indigo-600",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Panoramic Welcome Banner */}
        <div className="relative z-20 w-full rounded-2xl min-h-[140px] md:h-36 flex flex-col md:flex-row md:items-center justify-between px-6 md:px-8 py-5 border border-slate-200/60 shadow-xs mb-5">
          {/* Panoramic Rice Field & Mountain Landscape Image (clipped to rounded border) */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <img
              src="/welcome-banner-bg.jpg"
              alt="Rice fields panoramic landscape"
              className="w-full h-full object-cover object-[center_42%]"
            />
            {/* Contrast Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/40 to-transparent" />
          </div>

          {/* Left Welcome Text */}
          <div className="relative z-10 max-w-lg mb-3 md:mb-0">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight drop-shadow-sm">
              Welcome back, Mill Admin
            </h1>
            <p className="text-xs md:text-sm text-white/90 mt-1 font-medium drop-shadow-xs">
              Here&apos;s what&apos;s happening with your rice supply chain today.
            </p>
          </div>

          {/* Right Frosted Glass Date & Weather Pill */}
          <WeatherCalendarWidget />
        </div>

        {/* High-Risk EUDR Banner */}
        {!alertDismissed && (
          <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-xl px-4 py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white shrink-0">
                <AlertTriangle className="w-3 h-3 fill-white text-rose-500" />
              </div>
              <p className="text-xs sm:text-sm text-rose-700 font-medium">
                <strong className="font-semibold text-rose-800">
                  3 farms have high EUDR risk.
                </strong>{" "}
                Review before shipping to EU.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/farmers"
                className="text-xs font-semibold text-rose-700 hover:text-rose-800 hover:underline flex items-center gap-1"
              >
                <span>View Farms</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                type="button"
                onClick={() => setAlertDismissed(true)}
                className="text-rose-400 hover:text-rose-600 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Paddy Procured */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#10b981] flex items-center justify-center text-white shadow-sm shrink-0">
                <Leaf className="w-5 h-5 fill-white text-emerald-500" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-600 leading-tight">
                  Paddy Procured
                  <span className="block font-normal text-slate-400">This Month</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  482,750 kg
                </div>
                <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span>12.4% vs. last season</span>
                </div>
              </div>
            </div>
            {/* Green Sparkline */}
            <div className="w-16 h-8 shrink-0">
              <svg viewBox="0 0 70 30" className="w-full h-full stroke-emerald-500 fill-none">
                <path
                  d="M 2 24 Q 18 20, 32 16 T 68 8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 2: Active Batches */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#6366f1] flex items-center justify-center text-white shadow-sm shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-600 leading-tight">
                  Active Batches
                </div>
                <div className="text-xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                  18
                </div>
                <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span>2 vs. last week</span>
                </div>
              </div>
            </div>
            {/* Indigo Sparkline */}
            <div className="w-16 h-8 shrink-0">
              <svg viewBox="0 0 70 30" className="w-full h-full stroke-indigo-500 fill-none">
                <path
                  d="M 2 22 Q 22 26, 38 14 T 68 8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 3: Pending Lab Tests */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#f59e0b] flex items-center justify-center text-white shadow-sm shrink-0">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-600 leading-tight">
                  Pending Lab Tests
                </div>
                <div className="text-xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                  7
                </div>
                <div className="text-[10px] font-semibold text-purple-600 flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3 h-3 text-purple-600" />
                  <span>3 vs. last week</span>
                </div>
              </div>
            </div>
            {/* Purple Sparkline */}
            <div className="w-16 h-8 shrink-0">
              <svg viewBox="0 0 70 30" className="w-full h-full stroke-purple-500 fill-none">
                <path
                  d="M 2 8 Q 20 6, 36 20 T 68 18"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 4: Shipments in Progress */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#3b82f6] flex items-center justify-center text-white shadow-sm shrink-0">
                <Ship className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-600 leading-tight">
                  Shipments in Progress
                </div>
                <div className="text-xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                  5
                </div>
                <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span>1 vs. last week</span>
                </div>
              </div>
            </div>
            {/* Orange Sparkline */}
            <div className="w-16 h-8 shrink-0">
              <svg viewBox="0 0 70 30" className="w-full h-full stroke-amber-500 fill-none">
                <path
                  d="M 2 24 Q 24 20, 38 24 T 68 6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Middle Section: 3 Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card 1: Procurement Volume (kg) by Week */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 leading-tight">
                  Procurement Volume
                </h3>
                <span className="text-[10px] text-slate-400 font-normal">
                  (kg) by Week
                </span>
              </div>
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-[10px] font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span>{selectedSeason}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Bar Chart Canvas */}
            <div className="relative pt-2 pb-1">
              {/* Y-axis Labels & Guidelines */}
              <div className="relative h-44 flex flex-col justify-between text-[9px] text-slate-400 font-mono select-none">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-1">
                  <span className="w-6 shrink-0">200K</span>
                  <div className="flex-1" />
                </div>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-1">
                  <span className="w-6 shrink-0">150K</span>
                  <div className="flex-1" />
                </div>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-1">
                  <span className="w-6 shrink-0">100K</span>
                  <div className="flex-1" />
                </div>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-1">
                  <span className="w-6 shrink-0">50K</span>
                  <div className="flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 shrink-0">0</span>
                  <div className="flex-1" />
                </div>

                {/* Bars Absolute Overlay */}
                <div className="absolute inset-0 pl-8 pr-2 flex items-end justify-between gap-2 pointer-events-auto">
                  {weeklyData.map((d) => (
                    <div
                      key={d.week}
                      className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                    >
                      <div
                        style={{ height: d.height }}
                        className="w-full max-w-[24px] bg-[#10b981] rounded-t-sm group-hover:bg-[#059669] transition-all relative"
                      >
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold py-0.5 px-1.5 rounded shadow whitespace-nowrap transition-opacity z-10">
                          {(d.kg / 1000).toFixed(0)}k kg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* X-axis Labels */}
              <div className="pl-8 pr-2 flex justify-between text-[10px] text-slate-500 font-medium mt-2 select-none">
                {weeklyData.map((d) => (
                  <span key={d.week} className="flex-1 text-center">
                    {d.week}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Compliance Score Donut */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">
                Compliance Score
              </h3>
              <span className="text-[10px] text-slate-400 font-normal">
                (Current Season)
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-3 my-auto">
              {/* Donut Graphic */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="14"
                  />
                  {/* Segment: Low (<70) Red 4% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="14"
                    strokeDasharray="251.2"
                    strokeDashoffset="241.1" // 4% of 251.2
                    strokeLinecap="butt"
                  />
                  {/* Segment: Moderate (70-84) Amber 10% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="14"
                    strokeDasharray="251.2"
                    strokeDashoffset="226.0" // 10%
                    transform="rotate(14.4 50 50)"
                  />
                  {/* Segment: Good (85-94) Light Green 24% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#84cc16"
                    strokeWidth="14"
                    strokeDasharray="251.2"
                    strokeDashoffset="190.9" // 24%
                    transform="rotate(50.4 50 50)"
                  />
                  {/* Segment: Excellent (>=95) Emerald 62% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="14"
                    strokeDasharray="251.2"
                    strokeDashoffset="95.4" // 62%
                    transform="rotate(136.8 50 50)"
                  />
                </svg>

                {/* Center text in Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-extrabold text-slate-900 leading-none">
                    92.4%
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                    Avg. Score
                  </span>
                </div>
              </div>

              {/* Legend with percentages */}
              <div className="space-y-2 text-[11px] font-medium flex-1">
                <div className="flex items-center justify-between text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                    <span>Excellent (≥ 95)</span>
                  </div>
                  <span className="font-bold text-slate-900">62%</span>
                </div>

                <div className="flex items-center justify-between text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#84cc16]" />
                    <span>Good (85 – 94)</span>
                  </div>
                  <span className="font-bold text-slate-900">24%</span>
                </div>

                <div className="flex items-center justify-between text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                    <span>Moderate (70 – 84)</span>
                  </div>
                  <span className="font-bold text-slate-900">10%</span>
                </div>

                <div className="flex items-center justify-between text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                    <span>Low (&lt; 70)</span>
                  </div>
                  <span className="font-bold text-slate-900">4%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: EUDR Risk Map */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-900 leading-tight">
                EUDR Risk Map
              </h3>
              {/* Map Legend */}
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>High Risk</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Medium Risk</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Low Risk</span>
                </div>
              </div>
            </div>

            {/* Interactive Leaflet Map */}
            <div className="w-full h-52 rounded-xl overflow-hidden border border-slate-100 relative">
              <FarmMap
                markers={mapMarkers}
                center={[31.65, 74.15]}
                zoom={7}
                height="100%"
                dotStyle={true}
              />
            </div>
          </div>
        </div>

        {/* Lower Section Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Column 1: Districts Volume + Officer Activity */}
          <div className="lg:col-span-4 space-y-5 flex flex-col">
            {/* Top 5 Districts by Paddy Volume */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex-1">
              <h3 className="text-xs font-bold text-slate-900 mb-3">
                Top 5 Districts by Paddy Volume
              </h3>
              <div className="space-y-2.5">
                {districts.map((d) => (
                  <div key={d.name} className="flex items-center gap-3 text-xs">
                    <span className="w-20 text-slate-600 font-medium text-left truncate text-[11px]">
                      {d.name}
                    </span>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden relative">
                      <div
                        style={{ width: `${d.percent}%` }}
                        className="bg-[#059669] h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      />
                    </div>
                    <span className="w-10 text-[11px] font-bold text-slate-800 text-right">
                      {d.volume}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Procurement Officer Activity */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex-1">
              <div className="mb-2">
                <h3 className="text-xs font-bold text-slate-900 leading-tight">
                  Procurement Officer Activity
                </h3>
                <span className="text-[10px] text-slate-400 font-normal">
                  Lots entered per officer
                </span>
              </div>

              {/* Blue Bar Chart */}
              <div className="relative pt-2">
                <div className="relative h-28 flex flex-col justify-between text-[9px] text-slate-400 font-mono select-none">
                  <div className="border-b border-slate-100 pb-0.5">30</div>
                  <div className="border-b border-slate-100 pb-0.5">20</div>
                  <div className="border-b border-slate-100 pb-0.5">10</div>
                  <div>0</div>

                  {/* Bars Overlay */}
                  <div className="absolute inset-0 pl-6 pr-2 flex items-end justify-between gap-3 pointer-events-auto">
                    {officers.map((o) => (
                      <div
                        key={o.name}
                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                      >
                        <span className="text-[9px] font-bold text-slate-600 mb-0.5">
                          {o.count}
                        </span>
                        <div
                          style={{ height: o.height }}
                          className="w-full max-w-[26px] bg-[#3b82f6] rounded-t-sm group-hover:bg-[#2563eb] transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* X-axis labels */}
                <div className="pl-6 pr-2 flex justify-between text-[10px] text-slate-500 font-medium mt-1 select-none">
                  {officers.map((o) => (
                    <span key={o.name} className="flex-1 text-center">
                      {o.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Shipments by Status + Quote Card */}
          <div className="lg:col-span-4 space-y-5 flex flex-col">
            {/* Shipments by Status Stepper */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-xs font-bold text-slate-900 mb-4">
                Shipments by Status
              </h3>
              <div className="flex items-center justify-between gap-1">
                {shipmentStages.map((stage, i) => {
                  const Icon = stage.icon;
                  return (
                    <React.Fragment key={stage.label}>
                      <div className="flex flex-col items-center text-center flex-1">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-transform hover:scale-105",
                            stage.color
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[9px] font-medium text-slate-500 leading-tight h-5 flex items-center">
                          {stage.label}
                        </span>
                        <span className="text-xs font-bold text-slate-900 mt-1">
                          {stage.count}
                        </span>
                      </div>
                      {i < shipmentStages.length - 1 && (
                        <div className="text-slate-300 text-xs font-bold mb-4 shrink-0">
                          →
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Inspirational Quote / Sustainable Supply Chain Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex-1 relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10 max-w-[240px]">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                  <Leaf className="w-4 h-4 fill-emerald-600" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 leading-snug">
                  Smooth supply chains
                  <br />
                  build a sustainable tomorrow.
                </h4>
              </div>

              {/* Watercolor Rice Field Banner In Corner */}
              <div className="absolute right-0 bottom-0 w-48 h-32 opacity-85 pointer-events-none select-none">
                <img
                  src="/quote-rice-fields.jpg"
                  alt="Watercolor rice field illustration"
                  className="w-full h-full object-cover object-bottom"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/50 to-transparent" />
              </div>
            </div>
          </div>

          {/* Column 3: Recent Activity */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900">
                Recent Activity
              </h3>
              <Link
                href="/lots"
                className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
              >
                <span>View All</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            </div>

            <div className="space-y-3.5 flex-1 flex flex-col justify-around py-1">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      act.iconBg
                    )}
                  >
                    {act.icon === "lot" && <Leaf className="w-3.5 h-3.5" />}
                    {act.icon === "lab" && <FlaskConical className="w-3.5 h-3.5" />}
                    {act.icon === "batch" && <Layers className="w-3.5 h-3.5" />}
                    {act.icon === "shipment" && <Ship className="w-3.5 h-3.5" />}
                    {act.icon === "cert" && <Award className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 leading-snug truncate">
                      {act.title}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {act.actor}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 shrink-0 font-normal">
                    {act.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
