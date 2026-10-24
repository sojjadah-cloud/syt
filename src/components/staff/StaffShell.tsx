import Link from "next/link";
import { AdminLanguageSwitcher } from "@/components/admin/AdminLanguageSwitcher";
import { DepartmentIdentity, HeaderFrame } from "@/components/survey/Header";
import type { StaffI18n } from "@/lib/staff-i18n";
import { cn } from "@/lib/utils";

/** Page frame for the open staff forms (same header as the student survey; no sign-in). */
export function StaffShell({ i18n, back, wide, children }: { i18n: StaffI18n; back?: boolean; wide?: boolean; children: React.ReactNode }) {
  const { t, locale, dir } = i18n;
  return (
    <div dir={dir} lang={locale} className="min-h-dvh">
      <HeaderFrame right={<AdminLanguageSwitcher locale={locale} label={t.nav.home} />}>
        <DepartmentIdentity logoAlt={locale === "ar" ? "شعار قسم هندسة النظم" : "Systems Engineering Department logo"} />
      </HeaderFrame>
      <main className={cn("mx-auto px-4 pb-16 pt-6 md:px-6 lg:px-8 lg:pt-10", wide ? "max-w-7xl" : "max-w-5xl")}>
        {back && (
          <Link href="/staff" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
            <span aria-hidden className="rtl:rotate-180">
              ←
            </span>
            {t.common.backToStaff}
          </Link>
        )}
        {children}
      </main>
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 md:mb-8">
      <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-ink md:text-[28px]">{title}</h1>
      {subtitle && <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-muted">{subtitle}</p>}
    </div>
  );
}
