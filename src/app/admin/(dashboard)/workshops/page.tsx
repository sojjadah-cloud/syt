import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, PageHeader } from "@/components/admin/ui";
import { Badge, CreateInitiativeButton, ExportLinks, FilterBar, ReviewControl, toOpts } from "@/components/admin/engagement-ui";
import { EXPERTISE_AREAS, REVIEW_STATUSES, WORKSHOP_FORMATS } from "@/config/staff";
import { ACADEMIC_LEVELS } from "@/config/survey";
import { AttachmentLinks } from "@/components/admin/AttachmentLinks";
import { attachmentsFor } from "@/lib/attachments";
import { getAdminI18n } from "@/lib/admin-i18n";
import { params, type RawParams } from "@/lib/admin-params";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { workshopWhere } from "@/lib/engagement-queries";

export const metadata: Metadata = { title: "Workshops | SE Survey Admin" };

export default async function WorkshopsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const [admin, i18n, raw] = await Promise.all([requireAdmin(), getAdminI18n(), searchParams]);
  const { e, s, o, format } = i18n;
  const p = params(raw);
  const w = e.workshops;
  const rows = await prisma.proposedWorkshop.findMany({
    where: workshopWhere(raw),
    orderBy: [{ reviewStatus: "asc" }, { createdAt: "desc" }],
    include: { survey: { select: { profile: { select: { id: true, fullName: true } } } }, _count: { select: { initiatives: true } } },
    take: 300,
  });
  const files = await attachmentsFor("WORKSHOP", rows.map((r) => r.id));

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="workshops">
      <PageHeader title={w.title} subtitle={`${w.subtitle} ${format(e.common.count, { count: rows.length })}`} actions={<ExportLinks i18n={i18n} type="workshops" qs={p.qs()} />} />
      <FilterBar
        i18n={i18n}
        action="/admin/workshops"
        q={p.q}
        qLabel={w.f.q}
        selects={[
          { name: "field", label: w.f.field, value: p.raw("field"), options: toOpts(EXPERTISE_AREAS, s.options.expertise) },
          { name: "level", label: w.f.level, value: p.raw("level"), options: toOpts(ACADEMIC_LEVELS, o.academicLevel) },
          { name: "format", label: w.f.format, value: p.raw("format"), options: toOpts(WORKSHOP_FORMATS, s.options.workshopFormat) },
          { name: "status", label: w.f.status, value: p.raw("status"), options: toOpts(REVIEW_STATUSES, s.common.reviewStatus) },
        ]}
      />
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white px-5 py-12 text-center text-muted">{e.common.none}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {s.options.expertise[r.field]} · {w.cols.staff}:{" "}
                    <Link href={`/admin/staff/${r.survey.profile.id}`} className="hover:text-brand hover:underline">
                      {r.survey.profile.fullName}
                    </Link>
                    {r._count.initiatives > 0 && ` · ${e.common.initiatives}: ${r._count.initiatives}`}
                  </p>
                </div>
                <Badge status={r.reviewStatus} label={s.common.reviewStatus[r.reviewStatus]} />
              </div>
              <p className="mt-2 whitespace-pre-line text-[13.5px]">{r.description}</p>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    [s.contribution.w.levels, r.levels.map((l) => o.academicLevel[l]).join("، ")],
                    [s.contribution.w.format, r.format ? s.options.workshopFormat[r.format] : ""],
                    [s.contribution.w.duration, r.duration],
                    [s.contribution.w.maxParticipants, r.maxParticipants ?? ""],
                    [s.contribution.w.period, r.period],
                    [s.contribution.w.prerequisites, r.prerequisites],
                    [s.contribution.w.equipment, r.equipment],
                    [s.contribution.w.venue, r.venue],
                    [s.contribution.w.objectives, r.objectives],
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
              <AttachmentLinks label={e.common.attachments} files={files.get(r.id) ?? []} />
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
                <ReviewControl i18n={i18n} kind="workshop" id={r.id} status={r.reviewStatus} />
                <CreateInitiativeButton i18n={i18n} source="workshop" sourceId={r.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
