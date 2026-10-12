import React from "react";
import { useI18nStore } from "../../store/i18n.store";
import { Languages } from "lucide-react";
import { cn } from "../../lib/utils";

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { language, toggleLanguage } = useI18nStore();

  return (
    <button
      onClick={toggleLanguage}
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer",
        className
      )}
      title="Toggle between English and Urdu"
    >
      <Languages className="w-4 h-4 text-emerald-600" />
      <span>{language === "EN" ? "English" : "اردو"}</span>
      <span className="text-[10px] text-slate-400 border-l border-slate-200 pl-1">
        {language === "EN" ? "UR" : "EN"}
      </span>
    </button>
  );
}
