import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, PageHeader } from "@/components/admin/ui";
import { Badge, ExportLinks, FilterBar, toOpts } from "@/components/admin/engagement-ui";
import { buttonVariants } from "@/components/ui/button";
import { INITIATIVE_STATUSES } from "@/config/staff";
import { SPECIALISATIONS } from "@/config/survey";
import { createInitiative } from "@/lib/admin-actions";
import { getAdminI18n } from "@/lib/admin-i18n";
import { ci, params, type RawParams } from "@/lib/admin-params";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Scientific planning | SE Survey Admin" };

export default async function PlanningPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const [admin, i18n, raw] = await Promise.all([requireAdmin(), getAdminI18n(), searchParams]);
  const { e, s, format } = i18n;
  const pl = e.planning;
  const p = params(raw);
  const status = p.one("status", INITIATIVE_STATUSES);
  const pathway = p.one("pathway", SPECIALISATIONS.map((x) => x.value));
  const rows = await prisma.initiative.findMany({
    where: { ...(status ? { status } : {}), ...(pathway ? { pathwayCode: pathway } : {}), ...(p.q ? { title: ci(p.q) } : {}) },
    orderBy: [{ updatedAt: "desc" }],
    include: { _count: { select: { staff: true, students: true, milestones: true } } },
  });
  const source = (r: (typeof rows)[number]) =>
    r.opportunityId ? pl.source.opportunity : r.workshopId ? pl.source.workshop : r.projectId ? pl.source.project : r.moduleActivityId ? pl.source.activity : pl.source.none;

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="planning">
      <PageHeader
        title={pl.title}
        subtitle={`${pl.subtitle} ${format(e.common.count, { count: rows.length })}`}
        actions={
          <>
            <ExportLinks i18n={i18n} type="initiatives" qs={p.qs()} />
            <form action={createInitiative}>
              <input type="hidden" name="source" value="none" />
              <input type="hidden" name="title" value={pl.new} />
              <button className={buttonVariants({ size: "sm" })}>+ {pl.new}</button>
            </form>
          </>
        }
      />
      <FilterBar
        i18n={i18n}
        action="/admin/scientific-planning"
        q={p.q}
        qLabel={pl.f.q}
        selects={[
          { name: "status", label: pl.f.status, value: p.raw("status"), options: toOpts(INITIATIVE_STATUSES, s.options.initiativeStatus) },
          { name: "pathway", label: pl.f.pathway, value: p.raw("pathway"), options: SPECIALISATIONS.map((x) => ({ value: x.value, label: i18n.spec(x.value) })) },
        ]}
      />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[860px] text-[13.5px]">
          <thead className="border-b border-line bg-canvas/70 text-[12.5px] text-muted">
            <tr>
              {Object.values(pl.cols).map((h) => (
                <th key={h} className="px-4 py-3 text-start font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted">
                  {e.common.none}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="align-top hover:bg-canvas/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/scientific-planning/${r.id}`} className="font-medium hover:text-brand hover:underline">
                    {r.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[12.5px]">{source(r)}</td>
                <td className="px-4 py-3 text-[12.5px]">{r.pathwayCode ? i18n.spec(r.pathwayCode) : "—"}</td>
                <td className="px-4 py-3 tabular-nums">{r._count.staff}</td>
                <td className="px-4 py-3 tabular-nums">{r._count.students}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[12.5px]">
                  {r.startDate ? i18n.date(r.startDate) : "—"} → {r.endDate ? i18n.date(r.endDate) : "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge status={r.status} label={s.options.initiativeStatus[r.status]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
