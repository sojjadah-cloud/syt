"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en, { type Dictionary } from "./en";
import ar from "./ar";
import { format } from "./format";

export type Locale = "en" | "ar";
const DICTS: Record<Locale, Dictionary> = { en, ar };
const STORAGE_KEY = "se-survey:locale";

interface I18nValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Dictionary;
  setLocale: (l: Locale) => void;
  format: (template: string, vars: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export { format };

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved === "ar" || saved === "en") setLocaleState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.lang = locale;
    el.dir = locale === "ar" ? "rtl" : "ltr";
    document.title = `${DICTS[locale].meta.title} | ${DICTS[locale].header.deptEn}`;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      sessionStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ locale, dir: locale === "ar" ? "rtl" : "ltr", t: DICTS[locale], setLocale, format }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
