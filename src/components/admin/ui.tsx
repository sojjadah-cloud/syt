import Link from "next/link";
import { DepartmentIdentity, HeaderFrame } from "@/components/survey/Header";
import type { AdminI18n } from "@/lib/admin-i18n";
import { cn } from "@/lib/utils";
import { AdminLanguageSwitcher } from "./AdminLanguageSwitcher";

export function AdminShell({
  i18n,
  adminName,
  active,
  children,
}: {
  i18n: AdminI18n;
  adminName?: string;
  active?: "overview" | "students";
  children: React.ReactNode;
}) {
  const { t, locale, dir } = i18n;
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={cn(
        "-mb-px border-b-2 px-1 py-3 text-[14px] font-medium transition-colors",
        on ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
  return (
    <div dir={dir} lang={locale} className="min-h-dvh">
      <HeaderFrame
        right={
          <div className="flex items-center gap-2 text-[13px] sm:gap-3">
            {adminName && <span className="hidden text-muted lg:inline">{adminName}</span>}
            <AdminLanguageSwitcher locale={locale} label={t.nav.label} />
            {adminName && (
              <form action="/api/admin/logout" method="post">
                <button className="h-9 cursor-pointer whitespace-nowrap rounded-lg border border-line px-3 font-medium text-ink hover:bg-canvas">
                  {t.signOut}
                </button>
              </form>
            )}
          </div>
        }
      >
        <div className="flex min-w-0 items-center gap-3">
          <DepartmentIdentity logoAlt={locale === "ar" ? "شعار قسم هندسة النظم" : "Systems Engineering Department logo"} />
          <span className="hidden rounded-md border border-gold/40 bg-gold-soft px-2 py-0.5 text-[12px] font-medium text-[#7a6219] md:inline">
            {t.brandTag}
          </span>
        </div>
      </HeaderFrame>
      {active && (
        <div className="border-b border-line bg-white">
          <nav className="mx-auto flex max-w-7xl gap-6 px-4 md:px-6 lg:px-8" aria-label={t.nav.label}>
            {tab("/admin", t.nav.overview, active === "overview")}
            {tab("/admin/students", t.nav.students, active === "students")}
          </nav>
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 md:px-6 lg:px-8 lg:pt-8">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-ink md:text-[26px]">{title}</h1>
        {subtitle && <div className="mt-1.5 text-[13.5px] text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-4 w-1 rounded-full bg-gold" aria-hidden />
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <span className="h-px flex-1 bg-line" aria-hidden />
        {action}
      </div>
      {children}
    </section>
  );
}

export function Panel({ title, note, children, className }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card", className)}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        {note && <span className="shrink-0 text-[12px] text-muted">{note}</span>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function Kpi({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-card")}>
      {accent && <span className="absolute inset-y-0 start-0 w-1 bg-brand" aria-hidden />}
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-2 text-[30px] font-semibold leading-none tabular-nums tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-2 text-[12.5px] text-muted">{sub}</p>}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="flex h-full min-h-24 items-center justify-center rounded-xl bg-canvas text-[13px] text-muted">{text}</p>;
}

const pct = (v: number, total: number) => (total ? Math.round((v / total) * 100) : 0);

/** Single-series horizontal bars. Values and shares are always printed, so colour carries no meaning on its own. */
export function RankedBars({
  rows,
  total,
  empty,
  sort = true,
}: {
  rows: { label: string; value: number }[];
  total: number;
  empty: string;
  sort?: boolean;
}) {
  if (total === 0) return <Empty text={empty} />;
  const data = sort ? [...rows].sort((a, b) => b.value - a.value) : rows;
  const max = Math.max(1, ...data.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {data.map((r) => (
        <li key={r.label} title={`${r.label}: ${r.value} (${pct(r.value, total)}%)`}>
          <div className="flex items-baseline justify-between gap-3 text-[13px] leading-snug">
            <span className={cn("min-w-0", r.value ? "text-ink" : "text-muted")}>{r.label}</span>
            <span className="shrink-0 tabular-nums text-ink">
              {r.value}
              <span className="ms-1.5 inline-block w-9 text-end text-[12px] text-muted">{pct(r.value, total)}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-canvas">
            {r.value > 0 && <div className="h-full rounded-full bg-brand" style={{ width: `${(r.value / max) * 100}%` }} />}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Vertical bars for short ordinal scales (academic level, weekly hours). */
export function Columns({ rows, total, empty }: { rows: { label: string; value: number }[]; total: number; empty: string }) {
  if (total === 0) return <Empty text={empty} />;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex h-44 items-end gap-3 border-b border-line">
      {rows.map((r) => (
        <div key={r.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${r.label}: ${r.value} (${pct(r.value, total)}%)`}>
          <span className="mb-1 text-[13px] font-semibold tabular-nums text-ink">{r.value}</span>
          <div
            className="w-full max-w-14 rounded-t-[4px] bg-brand"
            style={{ height: `${(r.value / max) * 75}%`, minHeight: r.value ? 4 : 0 }}
          />
        </div>
      ))}
      <div className="sr-only">
        {rows.map((r) => `${r.label}: ${r.value}`).join(", ")}
      </div>
    </div>
  );
}

export function ColumnLabels({ labels }: { labels: string[] }) {
  return (
    <div className="mt-2 flex gap-3">
      {labels.map((l) => (
        <span key={l} className="min-w-0 flex-1 text-center text-[12px] leading-tight text-muted">
          {l}
        </span>
      ))}
    </div>
  );
}

// Sequential single-hue ramp for self-reported proficiency 1 → 5 (validated for adjacent-step separation).
export const PROF_COLORS = ["#fde4e6", "#f5a1a9", "#e4505d", "#a80d19", "#560610"];

export function ProficiencyLegend({ labels }: { labels: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted">
      {labels.map((l, i) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] ring-1 ring-black/5" style={{ background: PROF_COLORS[i] }} aria-hidden />
          {i + 1} · {l}
        </span>
      ))}
    </div>
  );
}

export function ProficiencyStack({ dist, labels }: { dist: number[]; labels: string[] }) {
  const n = dist.reduce((a, b) => a + b, 0);
  return (
    <div className="flex h-3.5 gap-[2px]" role="img" aria-label={dist.map((c, i) => `${labels[i]}: ${c}`).join(", ")}>
      {dist.map((c, i) =>
        c ? (
          <span
            key={i}
            title={`${i + 1} · ${labels[i]}: ${c}`}
            className="h-full first:rounded-s-[4px] last:rounded-e-[4px] ring-1 ring-inset ring-black/5"
            style={{ width: `${(c / n) * 100}%`, background: PROF_COLORS[i] }}
          />
        ) : null,
      )}
    </div>
  );
}
