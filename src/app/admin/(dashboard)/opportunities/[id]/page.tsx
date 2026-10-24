import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/ui";
import { CreateInitiativeButton, KV, MatchPanel, ReviewControl, Section2 } from "@/components/admin/engagement-ui";
import { getAdminI18n } from "@/lib/admin-i18n";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { matchAll } from "@/lib/matching";

export const metadata: Metadata = { title: "Opportunity | SE Survey Admin" };

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const [admin, i18n] = await Promise.all([requireAdmin(), getAdminI18n()]);
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  const op = await prisma.scientificOpportunity.findFirst({
    where: { id, survey: { status: "SUBMITTED" } },
    include: { survey: { include: { pathways: true, profile: true } }, initiatives: { select: { id: true, title: true, status: true } } },
  });
  if (!op) notFound();
  const { e, s, o } = i18n;
  const q = s.pathway.o;
  const join = (xs: string[]) => xs.join(i18n.locale === "ar" ? "، " : ", ");
  const match = await matchAll(op.requiredFields, op.targetLevels);

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="opportunities">
      <Link href="/admin/opportunities" className="text-[13px] text-muted hover:text-ink">
        ← {e.common.back}
      </Link>
      <div className="mt-3 mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12.5px] font-medium text-muted">{s.options.opportunityTypes[op.type]}</p>
          <h1 className="text-[24px] font-semibold leading-tight">{op.name}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {e.common.submittedBy}: {op.survey.profile.fullName} · {op.survey.pathways.map((p) => i18n.spec(p.pathwayCode)).join("، ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReviewControl i18n={i18n} kind="opportunity" id={op.id} status={op.reviewStatus} />
          <CreateInitiativeButton i18n={i18n} source="opportunity" sourceId={op.id} />
        </div>
      </div>
      {op.initiatives.length > 0 && (
        <p className="mb-4 text-[13px]">
          {e.common.initiatives}:{" "}
          {op.initiatives.map((x) => (
            <Link key={x.id} href={`/admin/scientific-planning/${x.id}`} className="me-3 text-brand hover:underline">
              {x.title} ({s.options.initiativeStatus[x.status]})
            </Link>
          ))}
        </p>
      )}
      <div className="grid gap-5">
        <Section2 title={e.opportunities.details}>
          <KV
            rows={[
              [q.organiser, op.organiser],
              [q.location, op.location],
              [q.url, op.url ? <a href={op.url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline" dir="ltr">{op.url}</a> : ""],
              [q.expectedDate, op.expectedDate ? i18n.date(op.expectedDate) : e.common.notSpecified],
              [q.deadline, op.registrationDeadline ? i18n.date(op.registrationDeadline) : e.common.notSpecified],
              [q.levels, join(op.targetLevels.map((l) => o.academicLevel[l]))],
              [q.participation, `${s.options.participation[op.participation]}${op.teamSize ? ` · ${q.teamSize}: ${op.teamSize}` : ""}`],
              [q.requiredFields, join(op.requiredFields.map((f) => o.fields[f]))],
              [q.requiredSkills, op.requiredSkills],
              [q.eligibility, op.eligibility],
              [q.preparation, op.preparation],
              [q.preparationDuration, op.preparationDuration],
              [q.equipment, op.equipment],
              [q.support, op.supportExpected],
              [q.priority, s.options.priority[op.priority]],
              [q.notes, op.notes],
            ]}
          />
        </Section2>
        <MatchPanel i18n={i18n} {...match} hasFields={op.requiredFields.length > 0} />
      </div>
    </AdminShell>
  );
}
