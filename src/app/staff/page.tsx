import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle, StaffShell } from "@/components/staff/StaffShell";
import { getStaffI18n } from "@/lib/staff-i18n";

export const metadata: Metadata = { title: "Staff Scientific Engagement | Systems Engineering Department" };
export const dynamic = "force-dynamic";

const CARDS = [
  { key: "pathway", href: "/staff/pathway", n: 1 },
  { key: "module", href: "/staff/module", n: 2 },
  { key: "contribution", href: "/staff/contribution", n: 3 },
] as const;

export default async function StaffHome() {
  const i18n = await getStaffI18n();
  const { t } = i18n;
  return (
    <StaffShell i18n={i18n} wide>
      <PageTitle title={t.landing.title} subtitle={t.landing.subtitle} />
      <div className="grid gap-5 lg:grid-cols-3">
        {CARDS.map((c) => {
          const card = t.landing.cards[c.key];
          return (
            <Link
              key={c.key}
              href={c.href}
              className="group relative flex flex-col rounded-2xl border border-line bg-white p-6 shadow-card transition-colors hover:border-gold/70"
            >
              <span className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-gold" aria-hidden />
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-white" aria-hidden>
                  {c.n}
                </span>
                <span className="text-[12.5px] font-medium uppercase tracking-wide text-muted">{card.role}</span>
              </div>
              <h2 className="mt-4 text-[18px] font-semibold leading-snug text-ink">{card.title}</h2>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted">{card.description}</p>
              <span className="mt-5 inline-flex h-9 w-fit items-center gap-2 rounded-lg bg-brand px-4 text-[14px] font-medium text-white group-hover:bg-brand-deep">
                {t.landing.start}
                <span aria-hidden className="rtl:rotate-180">
                  →
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-6 text-[13px] text-muted">{t.landing.multi}</p>
    </StaffShell>
  );
}
