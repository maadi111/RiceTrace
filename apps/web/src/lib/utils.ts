import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWeight(kg: number | string): string {
  const num = typeof kg === "string" ? parseFloat(kg) : kg;
  if (isNaN(num)) return "0 kg";
  return `${num.toLocaleString("en-US")} kg`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function maskCnic(cnic: string): string {
  if (!cnic || cnic.length !== 13) return cnic || "—";
  return `${cnic.slice(0, 5)}-*******-${cnic.slice(12)}`;
}

export function getEudrColor(risk: string): { bg: string; text: string; border: string } {
  switch (risk?.toUpperCase()) {
    case "LOW":
      return { bg: "bg-emerald-50 text-emerald-700", text: "text-emerald-700", border: "border-emerald-200" };
    case "MEDIUM":
      return { bg: "bg-amber-50 text-amber-700", text: "text-amber-700", border: "border-amber-200" };
    case "HIGH":
      return { bg: "bg-rose-50 text-rose-700", text: "text-rose-700", border: "border-rose-200" };
    default:
      return { bg: "bg-slate-100 text-slate-700", text: "text-slate-700", border: "border-slate-200" };
  }
}
