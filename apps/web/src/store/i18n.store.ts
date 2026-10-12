import { create } from "zustand";
import { persist } from "zustand/middleware";
import { translations, type Language } from "../lib/translations";

interface I18nState {
  language: Language;
  t: typeof translations.EN;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: "EN",
      t: translations.EN,
      setLanguage: (lang) =>
        set({
          language: lang,
          t: translations[lang],
        }),
      toggleLanguage: () =>
        set((state) => {
          const next = state.language === "EN" ? "UR" : "EN";
          return {
            language: next,
            t: translations[next],
          };
        }),
    }),
    {
      name: "ricetrace-language",
    }
  )
);
