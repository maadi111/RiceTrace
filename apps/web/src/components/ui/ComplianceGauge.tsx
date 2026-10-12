import React from "react";
import { cn } from "../../lib/utils";

interface ComplianceGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export function ComplianceGauge({
  score,
  size = 120,
  strokeWidth = 10,
  label = "Compliance Score",
  className,
}: ComplianceGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const offset = circumference - (clampedScore / 100) * circumference;

  let color = "#10b981"; // Emerald
  let textLabel = "COMPLIANT";
  if (clampedScore < 70) {
    color = "#ef4444"; // Rose
    textLabel = "AT RISK";
  } else if (clampedScore < 90) {
    color = "#f59e0b"; // Amber
    textLabel = "REVIEW";
  }

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          {/* Foreground progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">
            {clampedScore}
          </span>
          <span className="text-[10px] font-bold text-slate-400">/ 100</span>
        </div>
      </div>

      <div className="mt-2 text-center">
        <span
          className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {textLabel}
        </span>
        {label && (
          <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
        )}
      </div>
    </div>
  );
}
