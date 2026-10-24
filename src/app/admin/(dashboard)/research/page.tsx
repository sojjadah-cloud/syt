import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, PageHeader } from "@/components/admin/ui";
import { Badge, CreateInitiativeButton, ExportLinks, FilterBar, ReviewControl, toOpts } from "@/components/admin/engagement-ui";
import { CONTRIBUTION_TYPES, EXPERTISE_AREAS, REVIEW_STATUSES } from "@/config/staff";
import { ACADEMIC_LEVELS } from "@/config/survey";
import { AttachmentLinks } from "@/components/admin/AttachmentLinks";
import { attachmentsFor } from "@/lib/attachments";
import { getAdminI18n } from "@/lib/admin-i18n";
import { params, type RawParams } from "@/lib/admin-params";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { projectWhere } from "@/lib/engagement-queries";

export const metadata: Metadata = { title: "Research | SE Survey Admin" };

export default async function ResearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const [admin, i18n, raw] = await Promise.all([requireAdmin(), getAdminI18n(), searchParams]);
  const { e, s, o, format } = i18n;
  const p = params(raw);
  const r = e.research;
  const q = s.contribution.p;
  const rows = await prisma.proposedProject.findMany({
    where: projectWhere(raw),
    orderBy: [{ reviewStatus: "asc" }, { createdAt: "desc" }],
    include: { survey: { select: { profile: { select: { id: true, fullName: true } } } }, _count: { select: { initiatives: true } } },
    take: 300,
  });
  const files = await attachmentsFor("PROJECT", rows.map((r) => r.id));

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="research">
      <PageHeader title={r.title} subtitle={`${r.subtitle} ${format(e.common.count, { count: rows.length })}`} actions={<ExportLinks i18n={i18n} type="research" qs={p.qs()} />} />
      <FilterBar
        i18n={i18n}
        action="/admin/research"
        q={p.q}
        qLabel={r.f.q}
        selects={[
          { name: "field", label: r.f.field, value: p.raw("field"), options: toOpts(EXPERTISE_AREAS, s.options.expertise) },
          { name: "level", label: r.f.level, value: p.raw("level"), options: toOpts(ACADEMIC_LEVELS, o.academicLevel) },
          { name: "contribution", label: r.f.contribution, value: p.raw("contribution"), options: toOpts(CONTRIBUTION_TYPES, s.options.contributionType) },
          { name: "status", label: r.f.status, value: p.raw("status"), options: toOpts(REVIEW_STATUSES, s.common.reviewStatus) },
        ]}
      />
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white px-5 py-12 text-center text-muted">{e.common.none}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((x) => (
            <li key={x.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{x.title}</h3>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {s.options.expertise[x.field]} · {r.cols.staff}:{" "}
                    <Link href={`/admin/staff/${x.survey.profile.id}`} className="hover:text-brand hover:underline">
                      {x.survey.profile.fullName}
                    </Link>
                    {x.contributionType && ` (${s.options.contributionType[x.contributionType]})`}
                    {x._count.initiatives > 0 && ` · ${e.common.initiatives}: ${x._count.initiatives}`}
                  </p>
                </div>
                <Badge status={x.reviewStatus} label={s.common.reviewStatus[x.reviewStatus]} />
              </div>
              <p className="mt-2 whitespace-pre-line text-[13.5px]">
                <span className="text-muted">{q.problem}: </span>
                {x.problem}
              </p>
              {x.description && <p className="mt-1 whitespace-pre-line text-[13.5px]">{x.description}</p>}
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    [q.requiredFields, x.requiredFields.map((f) => o.fields[f]).join("، ")],
                    [q.requiredSkills, x.requiredSkills],
                    [q.levels, x.levels.map((l) => o.academicLevel[l]).join("، ")],
                    [q.studentCount, x.studentCount ?? ""],
                    [q.duration, x.duration],
                    [q.resources, x.resources],
                    [q.outcomes, x.expectedOutcomes],
                    [q.publication, x.publicationOptions],
                    [q.collaboration, x.collaboration],
                  ] as [string, string | number][]
                )
                  .filter(([, v]) => v !== "")
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="inline text-muted">{k}: </dt>
                      <dd className="inline">{v}</dd>
                    </div>
                  ))}
              </dl>
              <AttachmentLinks label={e.common.attachments} files={files.get(x.id) ?? []} />
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
                <ReviewControl i18n={i18n} kind="project" id={x.id} status={x.reviewStatus} />
                <CreateInitiativeButton i18n={i18n} source="project" sourceId={x.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
