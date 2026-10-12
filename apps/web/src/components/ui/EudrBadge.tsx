import React from "react";
import { cn } from "../../lib/utils";
import { ShieldCheck, AlertTriangle, AlertOctagon, HelpCircle } from "lucide-react";

interface EudrBadgeProps {
  risk: "LOW" | "MEDIUM" | "HIGH" | "PENDING" | string;
  showIcon?: boolean;
  className?: string;
}

export function EudrBadge({ risk, showIcon = true, className }: EudrBadgeProps) {
  const normRisk = (risk || "PENDING").toUpperCase();

  switch (normRisk) {
    case "LOW":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-200",
            className
          )}
          title="EUDR Deforestation Risk: LOW (Compliant)"
        >
          {showIcon && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
          <span>EUDR LOW</span>
        </span>
      );
    case "MEDIUM":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100/80 text-amber-800 border border-amber-200",
            className
          )}
          title="EUDR Deforestation Risk: MEDIUM (Review Recommended)"
        >
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
          <span>EUDR MEDIUM</span>
        </span>
      );
    case "HIGH":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100/90 text-rose-800 border border-rose-300 animate-pulse",
            className
          )}
          title="EUDR Deforestation Risk: HIGH (Non-Compliant / Restricted)"
        >
          {showIcon && <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />}
          <span>EUDR HIGH RISK</span>
        </span>
      );
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200",
            className
          )}
          title="EUDR Deforestation Risk: Assessment Pending"
        >
          {showIcon && <HelpCircle className="w-3.5 h-3.5 text-slate-500" />}
          <span>EUDR PENDING</span>
        </span>
      );
  }
}
