import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/ui";
import { Badge, KV, Section2 } from "@/components/admin/engagement-ui";
import { getAdminI18n } from "@/lib/admin-i18n";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Staff member | SE Survey Admin" };

export default async function StaffMember({ params }: { params: Promise<{ id: string }> }) {
  const [admin, i18n] = await Promise.all([requireAdmin(), getAdminI18n()]);
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  const p = await prisma.staffProfile.findUnique({
    where: { id },
    include: {
      user: { select: { email: true } },
      pathways: true,
      pathwaySurveys: { where: { status: "SUBMITTED" }, include: { pathways: true, opportunities: { select: { id: true, name: true, reviewStatus: true } } } },
      moduleSurveys: { where: { status: "SUBMITTED" }, select: { id: true, moduleCode: true, moduleName: true, _count: { select: { activities: true } } } },
      contributions: { where: { status: "SUBMITTED" }, orderBy: { updatedAt: "desc" }, include: { workshops: true, projects: true } },
      initiativeRoles: { include: { initiative: { select: { id: true, title: true, status: true } } } },
    },
  });
  if (!p) notFound();
  const { e, s, o } = i18n;
  const c = s.contribution;
  const join = (xs: string[]) => xs.join(i18n.locale === "ar" ? "، " : ", ");

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="staff">
      <Link href="/admin/staff" className="text-[13px] text-muted hover:text-ink">
        ← {e.common.back}
      </Link>
      <h1 className="mt-3 text-[24px] font-semibold">{p.fullName}</h1>
      <p className="mb-5 mt-1 text-[13px] text-muted">
        {p.position} · {p.department} · <span dir="ltr">{p.email ?? p.user?.email}</span>
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section2 title={e.staff.profile}>
          <KV
            rows={[
              [e.staff.pathways, join(p.pathways.map((x) => i18n.spec(x.pathwayCode)))],
              [
                e.common.initiatives,
                p.initiativeRoles.length ? (
                  <span className="flex flex-col gap-0.5">
                    {p.initiativeRoles.map((r) => (
                      <Link key={r.initiativeId} href={`/admin/scientific-planning/${r.initiativeId}`} className="text-brand hover:underline">
                        {r.initiative.title} · {s.options.initiativeStatus[r.initiative.status]}
                        {r.role && ` · ${r.role}`}
                      </Link>
                    ))}
                  </span>
                ) : (
                  ""
                ),
              ],
            ]}
          />
        </Section2>
        <Section2 title={e.staff.submissions}>
          <ul className="space-y-2 text-[13.5px]">
            {p.pathwaySurveys.map((x) => (
              <li key={x.id}>
                <span className="text-muted">{s.submissions.kind.pathway}: </span>
                {join(x.pathways.map((y) => i18n.spec(y.pathwayCode)))}
                <ul className="ms-4 mt-0.5 list-disc text-[13px]">
                  {x.opportunities.map((op) => (
                    <li key={op.id}>
                      <Link href={`/admin/opportunities/${op.id}`} className="hover:text-brand hover:underline">
                        {op.name}
                      </Link>{" "}
                      <Badge status={op.reviewStatus} label={s.common.reviewStatus[op.reviewStatus]} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {p.moduleSurveys.map((x) => (
              <li key={x.id}>
                <span className="text-muted">{s.submissions.kind.module}: </span>
                <Link href={`/admin/modules/${x.id}`} className="hover:text-brand hover:underline">
                  {x.moduleCode} — {x.moduleName}
                </Link>{" "}
                <span className="text-muted">({x._count.activities})</span>
              </li>
            ))}
            {p.pathwaySurveys.length + p.moduleSurveys.length + p.contributions.length === 0 && <li className="text-muted">{e.common.empty}</li>}
          </ul>
        </Section2>
      </div>
      {p.contributions.map((x) => (
        <div key={x.id} className="mt-5 grid gap-5 lg:grid-cols-2">
          <Section2 title={s.submissions.kind.contribution}>
            <KV
              rows={[
                [c.q1, join(x.expertise.map((v) => (v === "OTHER" && x.expertiseOther ? x.expertiseOther : s.options.expertise[v])))],
                [c.q2, join(x.supportAreas.map((v) => (v === "OTHER" && x.supportAreasOther ? x.supportAreasOther : s.options.supportAreas[v])))],
                [c.q5, `${x.mentorCompetitions ? s.options.mentor[x.mentorCompetitions] : ""}${x.mentorFields.length ? ` — ${join(x.mentorFields.map((v) => s.options.expertise[v]))}` : ""}`],
                [c.q6, join(x.deliveryPreferences.map((v) => s.options.delivery[v]))],
                [c.q7, join(x.levels.map((v) => o.academicLevel[v]))],
                [c.q8, x.duration ? s.options.duration[x.duration] : ""],
                [c.q9, `${join(x.availability.map((v) => s.options.availability[v]))}${x.availabilityNote ? ` — ${x.availabilityNote}` : ""}`],
                [c.q10, x.collaboration ? s.options.collaboration[x.collaboration] : ""],
                [c.q11, x.resourcesNeeded],
                [c.q12, x.superviseExternal ? s.options.superviseExternal[x.superviseExternal] : ""],
                [c.q13, x.recommendations],
              ]}
            />
          </Section2>
          <Section2 title={`${c.workshop} / ${c.project}`}>
            <ul className="space-y-2 text-[13.5px]">
              {x.workshops.map((w) => (
                <li key={w.id}>
                  <span className="text-muted">{c.workshop}: </span>
                  {w.title} · {s.options.expertise[w.field]} <Badge status={w.reviewStatus} label={s.common.reviewStatus[w.reviewStatus]} />
                </li>
              ))}
              {x.projects.map((pr) => (
                <li key={pr.id}>
                  <span className="text-muted">{c.project}: </span>
                  {pr.title} · {s.options.expertise[pr.field]} <Badge status={pr.reviewStatus} label={s.common.reviewStatus[pr.reviewStatus]} />
                </li>
              ))}
              {x.workshops.length + x.projects.length === 0 && <li className="text-muted">—</li>}
            </ul>
          </Section2>
        </div>
      ))}
    </AdminShell>
  );
}
