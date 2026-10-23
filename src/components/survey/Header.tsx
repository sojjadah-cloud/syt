"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND_LOGO_SRC } from "@/config/brand";
import { useI18n } from "@/i18n/context";

/** Official department logo. The file is supplied by the department and is never altered. */
export function DepartmentLogo({ alt, className = "h-12 md:h-16" }: { alt: string; className?: string }) {
  const [missing, setMissing] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // The image may have failed before hydration attached onError.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setMissing(true);
  }, []);
  if (missing) {
    return (
      <div
        className={`${className} aspect-square shrink-0 rounded-md border border-dashed border-line`}
        role="img"
        aria-label={alt}
        title="Add the official logo at public/brand/se-logo.jpeg"
      />
    );
  }
  // Plain <img> so the supplied logo keeps its intrinsic proportions.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={BRAND_LOGO_SRC} alt={alt} className={`${className} w-auto shrink-0 object-contain`} onError={() => setMissing(true)} />;
}

export function HeaderFrame({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
        {children}
        {right}
      </div>
      <div className="relative h-[2px] bg-gold" aria-hidden>
        <span className="absolute inset-y-0 start-0 w-16 bg-brand md:w-24" />
      </div>
    </header>
  );
}

export function DepartmentIdentity({ logoAlt }: { logoAlt: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 md:gap-4">
      <DepartmentLogo alt={logoAlt} />
      <div className="min-w-0 border-s border-line ps-3 md:ps-4">
        <p lang="ar" className="font-arabic text-[15px] font-semibold leading-tight text-ink md:text-base">
          قسم هندسة النظم
        </p>
        <p lang="en" className="mt-0.5 font-[family-name:var(--font-inter)] text-[12.5px] font-medium leading-tight text-muted md:text-sm">
          Systems Engineering Department
        </p>
      </div>
    </div>
  );
}

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div role="group" aria-label={t.header.switchLabel} className="flex shrink-0 rounded-lg border border-line p-0.5 text-[13px]">
      {(["en", "ar"] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          onClick={() => setLocale(l)}
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

export function Header() {
  const { t } = useI18n();
  return (
    <HeaderFrame right={<LanguageSwitcher />}>
      <DepartmentIdentity logoAlt={t.header.logoAlt} />
    </HeaderFrame>
  );
}
