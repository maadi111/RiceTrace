"use client";

import React, { useState } from "react";
import { useAuthStore } from "../../store/auth.store";
import { useI18nStore } from "../../store/i18n.store";
import { Search, Bell, User, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export function Header() {
  const { user } = useAuthStore();
  const { language, setLanguage } = useI18nStore();
  const [searchValue, setSearchValue] = useState("");

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200/80">
      {/* Search Bar with ⌘ K shortcut */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search farms, lots, batches, shipments..."
          className="w-72 sm:w-80 md:w-[420px] pl-10 pr-14 py-2 rounded-full border border-slate-200/90 bg-white text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-2xs"
        />
        <div className="absolute right-3.5 flex items-center pointer-events-none">
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded">
            ⌘ K
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Language Toggle: EN | UR Pill */}
        <div className="flex items-center bg-[#0f172a] text-white rounded-full px-3 py-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setLanguage(language === "EN" ? "UR" : "EN")}
            className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
          >
            <span className={cn(language === "EN" ? "text-white font-bold" : "text-slate-400 hover:text-white")}>
              EN
            </span>
            <span className="text-slate-500 text-[10px]">|</span>
            <span className={cn(language === "UR" ? "text-white font-bold" : "text-slate-400 hover:text-white")}>
              UR
            </span>
          </button>
        </div>

        {/* Notification Bell with Badge */}
        <button
          type="button"
          className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white absolute top-1.5 right-1.5" />
        </button>

        {/* User Profile with Chevron */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-300/80">
            <User className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-slate-800 leading-tight">
              {user?.role === "MILL_ADMIN"
                ? "Mill Admin"
                : user?.name || "Mill Admin"}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              {user?.organizationName || "Rice Mills Ltd."}
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors ml-0.5" />
        </div>
      </div>
    </header>
  );
}
