"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { useI18nStore } from "../../store/i18n.store";
import { cn } from "../../lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { language } = useI18nStore();

  return (
    <div className={cn("min-h-screen bg-[#f8fafc] flex", language === "UR" && "lang-ur")}>
      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        <Header />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-8 w-full max-w-[1700px] mx-auto">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
