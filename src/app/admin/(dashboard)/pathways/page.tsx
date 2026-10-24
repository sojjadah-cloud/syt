import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, PageHeader } from "@/components/admin/ui";
import { Chips, ExportLinks } from "@/components/admin/engagement-ui";
import { COMPETITION_TYPES } from "@/config/staff";
import { SPECIALISATIONS } from "@/config/survey";
import { getAdminI18n } from "@/lib/admin-i18n";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Pathway report | SE Survey Admin" };

const count = <T extends string>(lists: T[][]) => {
  const m = new Map<T, number>();
  for (const l of lists) for (const v of l) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

export default async function PathwaysReport() {
  const [admin, i18n] = await Promise.all([requireAdmin(), getAdminI18n()]);
  const { e, s, o } = i18n;
  const pr = e.pathways;
  const [surveys, studentCounts] = await Promise.all([
    prisma.pathwaySurvey.findMany({
      where: { status: "SUBMITTED" },
      include: { pathways: true, profile: { select: { id: true, fullName: true } }, opportunities: true, recommendations: true },
    }),
    prisma.submission.groupBy({ by: ["specialisation"], _count: { _all: true } }),
  ]);
  const join = (xs: string[]) => xs.join(i18n.locale === "ar" ? "، " : ", ");

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="pathways">
      <PageHeader title={pr.title} subtitle={pr.subtitle} actions={<ExportLinks i18n={i18n} type="pathways" />} />
      <div className="space-y-4">
        {SPECIALISATIONS.map(({ value: code }) => {
          const list = surveys.filter((x) => x.pathways.some((p) => p.pathwayCode === code));
          const opps = list.flatMap((x) => x.opportunities);
          const comps = opps.filter((x) => (COMPETITION_TYPES as readonly string[]).includes(x.type));
          const students = studentCounts.find((x) => x.specialisation === code)?._count._all ?? 0;
          return (
            <details key={code} className="group rounded-2xl border border-line bg-white shadow-card" open={list.length > 0}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <span className="font-semibold">{i18n.spec(code)}</span>
                <span className="text-[12.5px] text-muted">
                  {pr.leaders}: {new Set(list.map((x) => x.profile.id)).size} · {pr.opportunities}: {opps.length} · {pr.students}: {students}
                </span>
              </summary>
              <div className="border-t border-line px-5 py-4">
                {list.length === 0 ? (
                  <p className="text-[13px] text-muted">{pr.none}</p>
                ) : (
                  <dl className="grid gap-x-8 gap-y-4 text-[13.5px] md:grid-cols-2">
                    <div>
                      <dt className="mb-1 text-[12.5px] text-muted">{pr.leaders}</dt>
                      <dd>
                        {list.map((x) => (
                          <Link key={x.id} href={`/admin/staff/${x.profile.id}`} className="me-3 hover:text-brand hover:underline">
                            {x.profile.fullName}
                          </Link>
                        ))}
                      </dd>
                    </div>
                    <div>
                      <dt className="mb-1 text-[12.5px] text-muted">{pr.competitions}</dt>
                      <dd className="flex flex-col gap-0.5">
                        {comps.length
                          ? comps.map((x) => (
                              <Link key={x.id} href={`/admin/opportunities/${x.id}`} className="hover:text-brand hover:underline">
                                {x.name} <span className="text-muted">· {s.options.priority[x.priority]}</span>
                              </Link>
                            ))
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="mb-1 text-[12.5px] text-muted">{pr.research}</dt>
                      <dd className="flex flex-col gap-0.5">
                        {opps.filter((x) => !comps.includes(x)).map((x) => (
                          <Link key={x.id} href={`/admin/opportunities/${x.id}`} className="hover:text-brand hover:underline">
                            {x.name} <span className="text-muted">· {s.options.opportunityTypes[x.type]}</span>
                          </Link>
                        ))}
                      </dd>
                    </div>
                    <div>
                      <dt className="mb-1 text-[12.5px] text-muted">{pr.levels}</dt>
                      <dd>
                        <Chips items={count(list.map((x) => x.targetLevels)).map(([v, n]) => `${o.academicLevel[v]} (${n})`)} />
                      </dd>
                    </div>
                    <div>
                      <dt className="mb-1 text-[12.5px] text-muted">{pr.methods}</dt>
                      <dd>
                        <Chips items={count(list.map((x) => x.preparationMethods)).map(([v, n]) => `${s.options.preparationMethods[v]} (${n})`)} />
                      </dd>
                    </div>
                    <div>
                      <dt className="mb-1 text-[12.5px] text-muted">{pr.challenges}</dt>
                      <dd>
                        <Chips items={count(list.map((x) => x.challenges)).map(([v, n]) => `${s.options.challenges[v]} (${n})`)} />
                      </dd>
                    </div>
                    <div>
                      <dt className="mb-1 text-[12.5px] text-muted">{pr.support}</dt>
                      <dd>
                        <Chips items={count(list.map((x) => x.supportNeeded)).map(([v, n]) => `${s.options.deptSupport[v]} (${n})`)} />
                      </dd>
                    </div>
                    <div>
                      <dt className="mb-1 text-[12.5px] text-muted">{pr.recommendations}</dt>
                      <dd className="flex flex-col gap-0.5">
                        {list.flatMap((x) => x.recommendations).map((r) => (
                          <span key={r.id}>
                            {r.name} <span className="text-muted">· {s.options.priority[r.priority]}{r.period && ` · ${r.period}`}</span>
                          </span>
                        ))}
                      </dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="mb-1 text-[12.5px] text-muted">{pr.competencies}</dt>
                      <dd className="whitespace-pre-line">{join(list.map((x) => x.competencies).filter(Boolean))}</dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="mb-1 text-[12.5px] text-muted">{pr.partners}</dt>
                      <dd className="whitespace-pre-line">{join(list.map((x) => x.partners).filter(Boolean)) || "—"}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </AdminShell>
  );
}
