import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, PageHeader } from "@/components/admin/ui";
import { Badge, DateRange, ExportLinks, FilterBar, toOpts } from "@/components/admin/engagement-ui";
import { OPPORTUNITY_TYPES, PRIORITIES, REVIEW_STATUSES } from "@/config/staff";
import { ACADEMIC_LEVELS, SPECIALISATIONS } from "@/config/survey";
import { getAdminI18n } from "@/lib/admin-i18n";
import { params, type RawParams } from "@/lib/admin-params";
import { opportunityWhere } from "@/lib/engagement-queries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Opportunities | SE Survey Admin" };

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const [admin, i18n, raw] = await Promise.all([requireAdmin(), getAdminI18n(), searchParams]);
  const { e, s, o, format } = i18n;
  const p = params(raw);
  const rows = await prisma.scientificOpportunity.findMany({
    where: opportunityWhere(raw),
    orderBy: [{ priority: "asc" }, { expectedDate: "asc" }, { createdAt: "desc" }],
    include: { survey: { select: { pathways: true, profile: { select: { fullName: true } } } }, _count: { select: { initiatives: true } } },
    take: 300,
  });

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="opportunities">
      <PageHeader title={e.opportunities.title} subtitle={`${e.opportunities.subtitle} ${format(e.common.count, { count: rows.length })}`} actions={<ExportLinks i18n={i18n} type="opportunities" qs={p.qs()} />} />
      <FilterBar
        i18n={i18n}
        action="/admin/opportunities"
        q={p.q}
        qLabel={e.opportunities.f.q}
        selects={[
          { name: "pathway", label: e.opportunities.f.pathway, value: p.raw("pathway"), options: SPECIALISATIONS.map((x) => ({ value: x.value, label: i18n.spec(x.value) })) },
          { name: "type", label: e.opportunities.f.type, value: p.raw("type"), options: toOpts(OPPORTUNITY_TYPES, s.options.opportunityTypes) },
          { name: "level", label: e.opportunities.f.level, value: p.raw("level"), options: toOpts(ACADEMIC_LEVELS, o.academicLevel) },
          { name: "priority", label: e.opportunities.f.priority, value: p.raw("priority"), options: toOpts(PRIORITIES, s.options.priority) },
          { name: "status", label: e.opportunities.f.status, value: p.raw("status"), options: toOpts(REVIEW_STATUSES, s.common.reviewStatus) },
        ]}
        extra={
          <>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-muted">{e.opportunities.f.country}</span>
              <input name="country" defaultValue={p.raw("country")} className="h-10 w-full rounded-lg border border-line px-3 text-[13.5px]" />
            </label>
            <DateRange i18n={i18n} label={e.opportunities.f.date} from={p.raw("from")} to={p.raw("to")} />
          </>
        }
      />
      <p className="mb-3 text-[12.5px] text-muted">{e.common.draftsHidden}</p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[860px] text-[13.5px]">
          <thead className="border-b border-line bg-canvas/70 text-[12.5px] text-muted">
            <tr>
              {Object.values(e.opportunities.cols).map((h) => (
                <th key={h} className="px-4 py-3 text-start font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  {e.common.none}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="align-top hover:bg-canvas/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/opportunities/${r.id}`} className="font-medium hover:text-brand hover:underline">
                    {r.name}
                  </Link>
                  <div className="text-[12px] text-muted">
                    {[r.organiser, r.location].filter(Boolean).join(" · ")} {r._count.initiatives > 0 && `· ${e.common.initiatives}: ${r._count.initiatives}`}
                  </div>
                </td>
                <td className="px-4 py-3">{r.survey.pathways.map((x) => i18n.spec(x.pathwayCode)).join("، ")}</td>
                <td className="whitespace-nowrap px-4 py-3">{s.options.opportunityTypes[r.type]}</td>
                <td className="whitespace-nowrap px-4 py-3">{r.expectedDate ? i18n.date(r.expectedDate) : <span className="text-muted">{e.common.notSpecified}</span>}</td>
                <td className="px-4 py-3">{s.options.priority[r.priority]}</td>
                <td className="px-4 py-3">
                  <Badge status={r.reviewStatus} label={s.common.reviewStatus[r.reviewStatus]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
