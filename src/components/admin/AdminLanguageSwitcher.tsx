"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ADMIN_LOCALE_COOKIE } from "@/i18n/admin";

export function AdminLanguageSwitcher({ locale, label }: { locale: "en" | "ar"; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (l: "en" | "ar") => {
    if (l === locale) return;
    document.cookie = `${ADMIN_LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  };
  return (
    <div role="group" aria-label={label} aria-busy={pending || undefined} className="flex shrink-0 rounded-lg border border-line p-0.5 text-[13px]">
      {(["en", "ar"] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          onClick={() => set(l)}
          className={`h-8 cursor-pointer rounded-md px-2.5 font-medium transition-colors ${
            locale === l ? "bg-ink text-white" : "text-muted hover:text-ink"
          } ${l === "ar" ? "font-arabic" : ""}`}
        >
          {l === "en" ? "EN" : "عربي"}
        </button>
      ))}
    </div>
  );
}
