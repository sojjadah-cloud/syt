import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, PageHeader } from "@/components/admin/ui";
import { Chips, ExportLinks, FilterBar, toOpts } from "@/components/admin/engagement-ui";
import { AVAILABILITY, DELIVERY_PREFERENCES, EXPERTISE_AREAS, SUPPORT_AREAS } from "@/config/staff";
import { ACADEMIC_LEVELS } from "@/config/survey";
import { getAdminI18n } from "@/lib/admin-i18n";
import { params, type RawParams } from "@/lib/admin-params";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffWhere } from "@/lib/engagement-queries";

export const metadata: Metadata = { title: "Staff directory | SE Survey Admin" };

export default async function StaffDirectory({ searchParams }: { searchParams: Promise<RawParams> }) {
  const [admin, i18n, raw] = await Promise.all([requireAdmin(), getAdminI18n(), searchParams]);
  const { e, s, o, format } = i18n;
  const p = params(raw);
  const st = e.staff;
  const rows = await prisma.staffProfile.findMany({
    where: staffWhere(raw),
    orderBy: { fullName: "asc" },
    include: {
      user: { select: { email: true } },
      pathways: true,
      contributions: {
        where: { status: "SUBMITTED" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: { _count: { select: { workshops: true, projects: true } } },
      },
    },
    take: 300,
  });
  const join = (xs: string[]) => xs.join(i18n.locale === "ar" ? "، " : ", ");

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="staff">
      <PageHeader title={st.title} subtitle={`${st.subtitle} ${format(e.common.count, { count: rows.length })}`} actions={<ExportLinks i18n={i18n} type="staff" qs={p.qs()} />} />
      <FilterBar
        i18n={i18n}
        action="/admin/staff"
        q={p.q}
        qLabel={st.f.q}
        selects={[
          { name: "expertise", label: st.f.expertise, value: p.raw("expertise"), options: toOpts(EXPERTISE_AREAS, s.options.expertise) },
          { name: "support", label: st.f.support, value: p.raw("support"), options: toOpts(SUPPORT_AREAS, s.options.supportAreas) },
          { name: "delivery", label: st.f.delivery, value: p.raw("delivery"), options: toOpts(DELIVERY_PREFERENCES, s.options.delivery) },
          { name: "level", label: st.f.level, value: p.raw("level"), options: toOpts(ACADEMIC_LEVELS, o.academicLevel) },
          { name: "availability", label: st.f.availability, value: p.raw("availability"), options: toOpts(AVAILABILITY, s.options.availability) },
          { name: "workshop", label: st.f.workshop, value: p.raw("workshop"), options: toOpts(EXPERTISE_AREAS, s.options.expertise) },
          { name: "research", label: st.f.research, value: p.raw("research"), options: toOpts(EXPERTISE_AREAS, s.options.expertise) },
        ]}
      />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[920px] text-[13.5px]">
          <thead className="border-b border-line bg-canvas/70 text-[12.5px] text-muted">
            <tr>
              {Object.values(st.cols).map((h) => (
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
            {rows.map((r) => {
              const c = r.contributions[0];
              return (
                <tr key={r.id} className="align-top hover:bg-canvas/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/staff/${r.id}`} className="font-medium hover:text-brand hover:underline">
                      {r.fullName}
                    </Link>
                    <div className="text-[12px] text-muted">{r.position}</div>
                    <div className="mt-1 text-[11.5px] text-muted" dir="ltr">{r.email ?? r.user?.email}</div>
                  </td>
                  {c ? (
                    <>
                      <td className="px-4 py-3">
                        <Chips items={c.expertise.map((x) => (x === "OTHER" && c.expertiseOther ? c.expertiseOther : s.options.expertise[x]))} />
                      </td>
                      <td className="px-4 py-3 text-[12.5px]">{join(c.supportAreas.map((x) => s.options.supportAreas[x]))}</td>
                      <td className="px-4 py-3 text-[12.5px]">
                        {c.mentorCompetitions ? s.options.mentor[c.mentorCompetitions] : "—"}
                        {c.mentorFields.length > 0 && <div className="text-muted">{join(c.mentorFields.map((x) => s.options.expertise[x]))}</div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[12.5px]">
                        {format(st.workshops, { count: c._count.workshops })}
                        <br />
                        {format(st.projects, { count: c._count.projects })}
                      </td>
                      <td className="px-4 py-3 text-[12.5px]">{join(c.availability.map((x) => s.options.availability[x]))}</td>
                    </>
                  ) : (
                    <td colSpan={5} className="px-4 py-3 text-[12.5px] italic text-muted">
                      {st.noContribution}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
