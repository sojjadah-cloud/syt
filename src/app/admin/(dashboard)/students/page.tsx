import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, PageHeader } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { inputBase } from "@/components/ui/input";
import {
  ACADEMIC_LEVELS,
  EXPERIENCE_TYPES,
  PROFICIENCY_LEVELS,
  READINESS,
  SPECIALISATIONS,
  TEAM_ROLES,
  TECHNICAL_FIELDS,
  WEEKLY_HOURS,
} from "@/config/survey";
import { buildWhere, filtersToQuery, parseFilters } from "@/lib/admin-data";
import { getAdminI18n, specWithTrack } from "@/lib/admin-i18n";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Student database | SE Survey Admin" };
const PAGE_SIZE = 25;

function FilterSelect({
  name,
  label,
  value,
  all,
  options,
}: {
  name: string;
  label: string;
  value?: string | number;
  all: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[12.5px] font-medium text-muted">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className={cn(inputBase, "h-10 truncate px-3 text-[13.5px]", value !== undefined && "border-brand/50 bg-brand-soft/40")}
      >
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const opts = <K extends string>(keys: readonly K[], labels: Record<K, string>) => keys.map((k) => ({ value: k, label: labels[k] }));

const READINESS_TONE: Record<string, string> = {
  VERY_READY: "bg-green-50 text-green-800 border-green-200",
  SCHEDULE_DEPENDENT: "bg-green-50/60 text-green-800 border-green-100",
  NEEDS_TRAINING: "bg-gold-soft text-[#7a6219] border-gold/30",
  UNSURE: "bg-canvas text-muted border-line",
  NOT_READY: "bg-canvas text-muted border-line",
};

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [admin, i18n] = await Promise.all([requireAdmin(), getAdminI18n()]);
  const { t, o, format } = i18n;
  const st = t.students;
  const raw = await searchParams;
  const sp = new URLSearchParams(Object.entries(raw).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  const filters = parseFilters(sp);
  const page = Math.max(1, Math.floor(Number(sp.get("page")) || 1));
  const where = buildWhere(filters);
  const active = Object.values(filters).filter((v) => v !== undefined).length;

  const [total, rows] = await Promise.all([
    prisma.submission.count({ where }),
    prisma.submission.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { fields: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = filtersToQuery(filters);
  const pageHref = (p: number) => `/admin/students?${[qs, `page=${p}`].filter(Boolean).join("&")}`;

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="students">
      <PageHeader
        title={st.title}
        subtitle={`${total === 1 ? st.countOne : format(st.count, { count: total })} · ${st.selfReported}`}
        actions={
          <>
            <a className={buttonVariants({ variant: "outline", size: "sm" })} href={`/api/admin/export?format=csv${qs ? `&${qs}` : ""}`}>
              {st.exportCsv}
            </a>
            <a className={buttonVariants({ size: "sm" })} href={`/api/admin/export?format=xlsx${qs ? `&${qs}` : ""}`}>
              {st.exportExcel}
            </a>
          </>
        }
      />

      <form method="get" className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-[14px] font-semibold">{st.filters}</h2>
          {active > 0 && (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[12px] font-medium text-brand-deep">
              {format(st.activeFilters, { count: active })}
            </span>
          )}
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-muted">{st.search}</span>
          <input name="q" defaultValue={filters.q} placeholder={st.searchPlaceholder} className={cn(inputBase, "h-10 px-3 text-[13.5px]")} />
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect name="level" label={st.f.level} all={st.all} value={filters.level} options={opts(ACADEMIC_LEVELS, o.academicLevel)} />
          <FilterSelect
            name="spec"
            label={st.f.spec}
            all={st.all}
            value={filters.spec}
            options={SPECIALISATIONS.map((s) => ({ value: s.value, label: i18n.spec(s.value) }))}
          />
          <FilterSelect name="field" label={st.f.field} all={st.all} value={filters.field} options={opts(TECHNICAL_FIELDS, o.fields)} />
          <FilterSelect
            name="minProf"
            label={st.f.minProf}
            all={st.all}
            value={filters.minProf}
            options={PROFICIENCY_LEVELS.map((l) => ({ value: String(l), label: `${l}+ · ${o.proficiency[l]}` }))}
          />
          <FilterSelect name="exp" label={st.f.exp} all={st.all} value={filters.exp} options={opts(EXPERIENCE_TYPES, o.experience)} />
          <FilterSelect name="readiness" label={st.f.readiness} all={st.all} value={filters.readiness} options={opts(READINESS, o.readiness)} />
          <FilterSelect name="hours" label={st.f.hours} all={st.all} value={filters.hours} options={opts(WEEKLY_HOURS, o.weeklyHours)} />
          <FilterSelect name="role" label={st.f.role} all={st.all} value={filters.role} options={opts(TEAM_ROLES, o.teamRole)} />
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
          <Link href="/admin/students" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {st.reset}
          </Link>
          <button className={buttonVariants({ size: "sm", className: "px-5" })}>{st.apply}</button>
        </div>
      </form>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[920px] text-[13.5px]">
          <thead className="border-b border-line bg-canvas/70 text-[12.5px] text-muted">
            <tr>
              {[st.cols.student, st.cols.level, st.cols.spec, st.cols.fields, st.cols.readiness, st.cols.hours, st.cols.submitted].map((h) => (
                <th key={h} className="px-4 py-3 text-start font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-muted">
                  {st.none}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="align-top transition-colors hover:bg-canvas/60">
                <td className="px-4 py-3">
                  <Link href={`/admin/students/${r.id}`} className="font-medium text-ink hover:text-brand hover:underline">
                    {r.fullName}
                  </Link>
                  <div className="font-mono text-[12px] text-muted">
                    {r.studentId}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">{o.academicLevel[r.academicLevel]}</td>
                <td className="max-w-56 px-4 py-3">{specWithTrack(i18n, r)}</td>
                <td className="px-4 py-3">
                  <ul className="space-y-0.5">
                    {r.fields.map((f) => (
                      <li key={f.field}>
                        {i18n.field(f)} <span className="tabular-nums text-muted">· {f.proficiency}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("inline-block rounded-md border px-2 py-0.5 text-[12.5px] leading-snug", READINESS_TONE[r.readiness])}>
                    {o.readiness[r.readiness]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">{o.weeklyHours[r.weeklyHours]}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">{i18n.date(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-[13px]" aria-label="Pagination">
          <span className="text-muted">{format(st.page, { page, pages })}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={pageHref(page - 1)}>
                {st.prev}
              </Link>
            )}
            {page < pages && (
              <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={pageHref(page + 1)}>
                {st.next}
              </Link>
            )}
          </div>
        </nav>
      )}
    </AdminShell>
  );
}
