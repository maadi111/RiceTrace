"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, PlusCircle, Factory, Ship } from "lucide-react";
import { cn } from "../../lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  const links = [
    { title: "Home", href: "/dashboard", icon: LayoutDashboard },
    { title: "Farmers", href: "/farmers", icon: Users },
    { title: "New Lot", href: "/lots/new", icon: PlusCircle, isAction: true },
    { title: "Milling", href: "/milling", icon: Factory },
    { title: "Export", href: "/shipments", icon: Ship },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
      {links.map((l) => {
        const isActive = pathname === l.href;
        const Icon = l.icon;

        if (l.isAction) {
          return (
            <Link
              key={l.href}
              href={l.href}
              className="flex flex-col items-center -mt-6 group"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-600 group-hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 border-2 border-white transition-transform active:scale-95">
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-emerald-800 mt-1">
                {l.title}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex flex-col items-center py-1 px-2 rounded-xl transition-colors",
              isActive ? "text-emerald-700 font-bold" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{l.title}</span>
          </Link>
        );
      })}
    </div>
  );
}
