import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { AdminShell, PageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/admin/engagement-ui";
import { getAdminI18n } from "@/lib/admin-i18n";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Overview | SE Survey Admin" };

function Stat({ label, value, sub, href }: { label: string; value: number | string; sub?: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-line bg-white p-5 shadow-card transition-colors hover:border-gold/70">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-2 text-[30px] font-semibold leading-none tabular-nums text-ink">{value}</p>
      {sub && <p className="mt-2 text-[12.5px] text-muted">{sub}</p>}
    </Link>
  );
}

function Block({ title, href, more, children }: { title: string; href?: string; more?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {href && more && (
          <Link href={href} className="text-[13px] font-medium text-brand hover:underline">
            {more}
          </Link>
        )}
      </div>
      <div className="px-5 py-3">{children}</div>
    </section>
  );
}

export default async function AdminOverview() {
  const [admin, i18n] = await Promise.all([requireAdmin(), getAdminI18n()]);
  const { e, s, o, format } = i18n;
  const h = e.home;
  const hdr = await headers();
  const host = hdr.get("x-forwarded-host")?.split(",")[0]?.trim() || hdr.get("host") || "";
  const origin = `${hdr.get("x-forwarded-proto")?.split(",")[0]?.trim() || (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  const ov = e.overview;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const submitted = { survey: { status: "SUBMITTED" as const } };
  const pending = { ...submitted, reviewStatus: { in: ["PENDING" as const, "UNDER_REVIEW" as const] } };

  const [students, studentsWeek, ready, staff, opportunities, workshops, research, activities, pendOpp, pendWs, pendPr, initiatives, recent] = await Promise.all([
    prisma.submission.count(),
    prisma.submission.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.submission.count({ where: { readiness: { in: ["VERY_READY", "SCHEDULE_DEPENDENT"] } } }),
    prisma.staffProfile.count({
      where: { OR: [{ pathwaySurveys: { some: { status: "SUBMITTED" } } }, { moduleSurveys: { some: { status: "SUBMITTED" } } }, { contributions: { some: { status: "SUBMITTED" } } }] },
    }),
    prisma.scientificOpportunity.count({ where: submitted }),
    prisma.proposedWorkshop.count({ where: submitted }),
    prisma.proposedProject.count({ where: submitted }),
    prisma.moduleActivity.count({ where: submitted }),
    prisma.scientificOpportunity.findMany({ where: pending, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, reviewStatus: true, type: true } }),
    prisma.proposedWorkshop.findMany({ where: pending, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, title: true, reviewStatus: true } }),
    prisma.proposedProject.findMany({ where: pending, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, title: true, reviewStatus: true } }),
    prisma.initiative.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, title: true, status: true, _count: { select: { students: true, staff: true } } },
    }),
    prisma.submission.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, fullName: true, academicLevel: true, specialisation: true, createdAt: true } }),
  ]);

  const review = [
    ...pendOpp.map((x) => ({ href: `/admin/opportunities/${x.id}`, label: x.name, kind: s.options.opportunityTypes[x.type], status: x.reviewStatus })),
    ...pendWs.map((x) => ({ href: "/admin/workshops?status=PENDING", label: x.title, kind: s.contribution.workshop, status: x.reviewStatus })),
    ...pendPr.map((x) => ({ href: "/admin/research?status=PENDING", label: x.title, kind: s.contribution.project, status: x.reviewStatus })),
  ];

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="overview">
      <PageHeader title={h.title} subtitle={h.subtitle} />

      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">{h.students}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={ov.students} value={students} sub={format(h.lastWeek, { count: studentsWeek })} href="/admin/students" />
        <Stat label={i18n.t.overview.kpi.ready} value={students ? `${Math.round((ready / students) * 100)}%` : "—"} sub={i18n.t.overview.kpi.readySub} href="/admin/analytics" />
        <Stat label={e.nav.analytics} value="→" sub={i18n.t.overview.subtitle} href="/admin/analytics" />
      </div>

      <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wide text-muted">{h.staff}</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={ov.staff} value={staff} href="/admin/staff" />
        <Stat label={ov.opportunities} value={opportunities} href="/admin/opportunities" />
        <Stat label={`${e.nav.workshops} / ${e.nav.research}`} value={`${workshops} / ${research}`} href="/admin/workshops" />
        <Stat label={ov.activities} value={activities} href="/admin/modules" />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Block title={h.needsReview} href="/admin/opportunities?status=PENDING" more={h.viewAll}>
          {review.length === 0 ? (
            <p className="py-3 text-[13.5px] text-muted">{h.noReview}</p>
          ) : (
            <ul className="divide-y divide-line">
              {review.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={r.href} className="min-w-0 hover:text-brand hover:underline">
                    <span className="block truncate text-[14px] font-medium">{r.label}</span>
                    <span className="text-[12.5px] text-muted">{r.kind}</span>
                  </Link>
                  <Badge status={r.status} label={s.common.reviewStatus[r.status]} />
                </li>
              ))}
            </ul>
          )}
        </Block>
        <Block title={h.inProgress} href="/admin/scientific-planning" more={h.viewAll}>
          {initiatives.length === 0 ? (
            <p className="py-3 text-[13.5px] text-muted">{h.noInitiatives}</p>
          ) : (
            <ul className="divide-y divide-line">
              {initiatives.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/admin/scientific-planning/${x.id}`} className="min-w-0 hover:text-brand hover:underline">
                    <span className="block truncate text-[14px] font-medium">{x.title}</span>
                    <span className="text-[12.5px] text-muted">
                      {e.planning.cols.staff}: {x._count.staff} · {e.planning.cols.students}: {x._count.students}
                    </span>
                  </Link>
                  <Badge status={x.status} label={s.options.initiativeStatus[x.status]} />
                </li>
              ))}
            </ul>
          )}
        </Block>
        <Block title={h.latest} href="/admin/students" more={h.viewAll}>
          {recent.length === 0 ? (
            <p className="py-3 text-[13.5px] text-muted">{e.common.empty}</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                  <Link href={`/admin/students/${r.id}`} className="min-w-0 truncate font-medium hover:text-brand hover:underline">
                    {r.fullName}
                  </Link>
                  <span className="shrink-0 text-[12.5px] text-muted">
                    {o.academicLevel[r.academicLevel]} · {i18n.date(r.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>
        <Block title={h.share}>
          <ul className="space-y-3 py-1 text-[13.5px]">
            {(
              [
                [h.studentLink, "/"],
                [h.staffLink, "/staff"],
              ] as const
            ).map(([label, path]) => (
              <li key={path}>
                <p className="text-muted">{label}</p>
                <a href={path} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-[13px] text-brand hover:underline" dir="ltr">
                  {origin + path}
                </a>
              </li>
            ))}
          </ul>
        </Block>
      </div>
    </AdminShell>
  );
}
