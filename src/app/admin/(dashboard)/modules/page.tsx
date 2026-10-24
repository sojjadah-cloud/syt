import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, PageHeader } from "@/components/admin/ui";
import { ExportLinks, FilterBar, toOpts } from "@/components/admin/engagement-ui";
import { ACTIVITY_TIMINGS, COMPETITION_POTENTIAL, MODULE_ACTIVITY_TYPES } from "@/config/staff";
import { ACADEMIC_LEVELS } from "@/config/survey";
import { getAdminI18n } from "@/lib/admin-i18n";
import { params, type RawParams } from "@/lib/admin-params";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { moduleWhere } from "@/lib/engagement-queries";

export const metadata: Metadata = { title: "Modules | SE Survey Admin" };

export default async function ModulesPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const [admin, i18n, raw] = await Promise.all([requireAdmin(), getAdminI18n(), searchParams]);
  const { e, s, o, format } = i18n;
  const p = params(raw);
  const m = e.modules;
  const rows = await prisma.moduleSurvey.findMany({
    where: moduleWhere(raw),
    orderBy: [{ moduleCode: "asc" }],
    include: {
      profile: { select: { id: true, fullName: true } },
      _count: { select: { outcomes: true } },
      activities: { select: { id: true, title: true, type: true, competitionPotential: true, assessmentMethods: true, _count: { select: { outcomes: true } } } },
    },
    take: 300,
  });

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="modules">
      <PageHeader title={m.title} subtitle={`${m.subtitle} ${format(e.common.count, { count: rows.length })}`} actions={<ExportLinks i18n={i18n} type="modules" qs={p.qs()} />} />
      <p className="mb-4 rounded-lg border border-gold/40 bg-gold-soft/70 px-3 py-2 text-[12.5px]">{m.approvalNote}</p>
      <FilterBar
        i18n={i18n}
        action="/admin/modules"
        q={p.q}
        qLabel={m.f.q}
        selects={[
          { name: "level", label: m.f.level, value: p.raw("level"), options: toOpts(ACADEMIC_LEVELS, o.academicLevel) },
          { name: "type", label: m.f.type, value: p.raw("type"), options: toOpts(MODULE_ACTIVITY_TYPES, s.options.moduleActivityTypes) },
          { name: "potential", label: m.f.potential, value: p.raw("potential"), options: toOpts(COMPETITION_POTENTIAL, s.options.competitionPotential) },
          { name: "timing", label: m.timing, value: p.raw("timing"), options: toOpts(ACTIVITY_TIMINGS, s.options.timing) },
        ]}
      />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[860px] text-[13.5px]">
          <thead className="border-b border-line bg-canvas/70 text-[12.5px] text-muted">
            <tr>
              {Object.values(m.cols).map((h) => (
                <th key={h} className="px-4 py-3 text-start font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted">
                  {e.common.none}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="align-top hover:bg-canvas/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/modules/${r.id}`} className="font-medium hover:text-brand hover:underline">
                    <span className="font-mono text-[12.5px]">{r.moduleCode}</span> — {r.moduleName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/staff/${r.profile.id}`} className="hover:text-brand hover:underline">
                    {r.profile.fullName}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {r.level ? o.academicLevel[r.level] : "—"}
                  {r.semester && ` · ${s.options.semesters[r.semester as keyof typeof s.options.semesters] ?? r.semester}`}
                </td>
                <td className="px-4 py-3 tabular-nums">{r._count.outcomes}</td>
                <td className="px-4 py-3">
                  {r.activities.length === 0 ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {r.activities.map((a) => (
                        <li key={a.id}>
                          {a.title} <span className="text-muted">· {s.options.moduleActivityTypes[a.type]}</span>
                          {a.competitionPotential && <span className="text-muted"> · {s.options.competitionPotential[a.competitionPotential]}</span>}
                          <span className="text-muted"> · {m.linked}: {a._count.outcomes}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
