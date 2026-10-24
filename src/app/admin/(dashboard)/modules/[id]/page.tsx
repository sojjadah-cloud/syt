import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/ui";
import { Badge, CreateInitiativeButton, KV, ReviewControl, Section2 } from "@/components/admin/engagement-ui";
import { AttachmentLinks } from "@/components/admin/AttachmentLinks";
import { attachmentsFor } from "@/lib/attachments";
import { getAdminI18n } from "@/lib/admin-i18n";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Module | SE Survey Admin" };

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const [admin, i18n] = await Promise.all([requireAdmin(), getAdminI18n()]);
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  const m = await prisma.moduleSurvey.findFirst({
    where: { id, status: "SUBMITTED" },
    include: {
      profile: true,
      outcomes: { orderBy: { sortOrder: "asc" } },
      activities: { orderBy: { sortOrder: "asc" }, include: { outcomes: { include: { outcome: true } }, initiatives: { select: { id: true, title: true } } } },
    },
  });
  if (!m) notFound();
  const { e, s, o } = i18n;
  const q = s.module;
  const [moduleFiles, activityFiles] = await Promise.all([attachmentsFor("MODULE", [m.id]), attachmentsFor("ACTIVITY", m.activities.map((a) => a.id))]);
  const join = (xs: string[]) => xs.join(i18n.locale === "ar" ? "، " : ", ");

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="modules">
      <Link href="/admin/modules" className="text-[13px] text-muted hover:text-ink">
        ← {e.common.back}
      </Link>
      <div className="mt-3 mb-5">
        <p className="font-mono text-[13px] text-muted">{m.moduleCode}</p>
        <h1 className="text-[24px] font-semibold leading-tight">{m.moduleName}</h1>
        <p className="mt-1 text-[13px] text-muted">
          {e.common.submittedBy}:{" "}
          <Link href={`/admin/staff/${m.profile.id}`} className="hover:text-brand hover:underline">
            {m.profile.fullName}
          </Link>
          {" · "}
          {m.level ? o.academicLevel[m.level] : ""} {m.semester && `· ${s.options.semesters[m.semester as keyof typeof s.options.semesters] ?? m.semester}`}
        </p>
      </div>
      <p className="mb-5 rounded-lg border border-gold/40 bg-gold-soft/70 px-3 py-2 text-[12.5px]">{e.modules.approvalNote}</p>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section2 title={q.steps[0].title}>
          <KV
            rows={[
              [q.q4, m.overview],
              [e.modules.practical, m.hasPractical == null ? "" : m.hasPractical ? `${e.common.yes} — ${m.practicalDetails}` : e.common.no],
              [q.q8, m.canSupportActivity ? s.options.canSupport[m.canSupportActivity] : ""],
              [e.modules.resources, m.resources],
            ]}
          />
          <AttachmentLinks label={e.common.attachments} files={moduleFiles.get(m.id) ?? []} />
        </Section2>
        <Section2 title={e.modules.outcomes}>
          <ul className="space-y-2 text-[13.5px]">
            {m.outcomes.map((x) => (
              <li key={x.id}>
                <span className="me-2 font-mono font-semibold">{x.identifier}</span>
                {x.description}
                {x.category && <span className="text-muted"> · {x.category}</span>}
              </li>
            ))}
          </ul>
        </Section2>
      </div>
      <h2 className="mt-8 mb-3 text-[15px] font-semibold">{e.modules.activities}</h2>
      <div className="space-y-4">
        {m.activities.map((a) => (
          <Section2
            key={a.id}
            title={`${a.title} · ${s.options.moduleActivityTypes[a.type]}`}
            action={<Badge status={a.reviewStatus} label={s.common.reviewStatus[a.reviewStatus]} />}
          >
            <KV
              rows={[
                [q.a.description, a.description],
                [q.a.tasks, a.studentTasks],
                [q.a.format, `${s.options.participation[a.format]}${a.teamSize ? ` · ${a.teamSize}` : ""}`],
                [q.a.duration, a.duration],
                [e.modules.linked, join(a.outcomes.map((l) => `${l.outcome.identifier} — ${l.outcome.description}`))],
                [e.modules.assessment, join([...a.assessmentMethods.map((x) => s.options.assessment[x]), ...(a.assessmentOther ? [a.assessmentOther] : [])])],
                [e.modules.resources, a.resources],
                [e.modules.timing, a.timing ? s.options.timing[a.timing] : ""],
                [e.modules.potential, a.competitionPotential ? `${s.options.competitionPotential[a.competitionPotential]}${a.competitionNote ? ` — ${a.competitionNote}` : ""}` : ""],
                [e.common.initiatives, a.initiatives.length ? join(a.initiatives.map((x) => x.title)) : ""],
              ]}
            />
            <AttachmentLinks label={e.common.attachments} files={activityFiles.get(a.id) ?? []} />
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
              <ReviewControl i18n={i18n} kind="activity" id={a.id} status={a.reviewStatus} />
              <CreateInitiativeButton i18n={i18n} source="activity" sourceId={a.id} />
            </div>
          </Section2>
        ))}
      </div>
    </AdminShell>
  );
}
