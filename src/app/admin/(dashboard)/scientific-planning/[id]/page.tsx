import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/ui";
import { Badge, MatchPanel, Section2 } from "@/components/admin/engagement-ui";
import { buttonVariants } from "@/components/ui/button";
import { inputBase } from "@/components/ui/input";
import { INITIATIVE_STATUSES, STUDENT_ASSIGNMENT_STATUSES } from "@/config/staff";
import { ACADEMIC_LEVELS, SPECIALISATIONS, TECHNICAL_FIELDS } from "@/config/survey";
import {
  addMilestone,
  changeInitiativeStatus,
  updateInitiative,
  updateInitiativeStaff,
  updateInitiativeStudent,
  updateMilestone,
} from "@/lib/admin-actions";
import { getAdminI18n } from "@/lib/admin-i18n";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { matchAll } from "@/lib/matching";
import { dateToForm } from "@/lib/staff-schema";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Initiative | SE Survey Admin" };

const field = cn(inputBase, "h-10 px-3 text-[13.5px]");
const area = cn(inputBase, "min-h-20 px-3 py-2 text-[13.5px]");
const lbl = "mb-1.5 block text-[12.5px] font-medium text-muted";

export default async function InitiativePage({ params }: { params: Promise<{ id: string }> }) {
  const [admin, i18n] = await Promise.all([requireAdmin(), getAdminI18n()]);
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  const x = await prisma.initiative.findUnique({
    where: { id },
    include: {
      opportunity: { select: { id: true, name: true } },
      workshop: { select: { id: true, title: true } },
      project: { select: { id: true, title: true } },
      moduleActivity: { select: { title: true, surveyId: true } },
      staff: { include: { profile: { select: { id: true, fullName: true, position: true } } } },
      students: {
        orderBy: { createdAt: "asc" },
        include: { submission: { select: { id: true, fullName: true, studentId: true, academicLevel: true, specialisation: true } } },
      },
      milestones: { orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] },
      statusChanges: { orderBy: { createdAt: "desc" }, include: { changedBy: { select: { name: true } } } },
    },
  });
  if (!x) notFound();
  const { e, s, o, format } = i18n;
  const pl = e.planning;
  const match = await matchAll(x.requiredFields, x.targetLevels);

  const related = x.opportunity
    ? { href: `/admin/opportunities/${x.opportunity.id}`, label: `${pl.source.opportunity}: ${x.opportunity.name}` }
    : x.workshop
      ? { href: `/admin/workshops`, label: `${pl.source.workshop}: ${x.workshop.title}` }
      : x.project
        ? { href: `/admin/research`, label: `${pl.source.project}: ${x.project.title}` }
        : x.moduleActivity
          ? { href: `/admin/modules/${x.moduleActivity.surveyId}`, label: `${pl.source.activity}: ${x.moduleActivity.title}` }
          : null;

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="planning">
      <Link href="/admin/scientific-planning" className="text-[13px] text-muted hover:text-ink">
        ← {e.common.back}
      </Link>
      <div className="mt-3 mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold leading-tight">{x.title}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {format(pl.created, { date: i18n.date(x.createdAt) })}
            {related && (
              <>
                {" · "}
                {pl.related}:{" "}
                <Link href={related.href} className="text-brand hover:underline">
                  {related.label}
                </Link>
              </>
            )}
          </p>
        </div>
        <Badge status={x.status} label={s.options.initiativeStatus[x.status]} />
      </div>
      <p className="mb-5 rounded-lg border border-gold/40 bg-gold-soft/70 px-3 py-2 text-[12.5px]">{pl.approvalNote}</p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Section2 title={e.opportunities.details}>
          <form action={updateInitiative.bind(null, x.id)} className="space-y-4">
            <label className="block">
              <span className={lbl}>{pl.fields.title}</span>
              <input name="title" defaultValue={x.title} required maxLength={200} className={field} />
            </label>
            <label className="block">
              <span className={lbl}>{pl.fields.pathway}</span>
              <select name="pathwayCode" defaultValue={x.pathwayCode ?? ""} className={field}>
                <option value="">—</option>
                {SPECIALISATIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {i18n.spec(p.value)}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className={lbl}>{pl.fields.requiredFields}</legend>
              <div className="flex flex-wrap gap-1.5">
                {TECHNICAL_FIELDS.map((f) => (
                  <label key={f} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-[12.5px] has-[:checked]:border-brand has-[:checked]:bg-brand-soft/50">
                    <input type="checkbox" name="requiredFields" value={f} defaultChecked={x.requiredFields.includes(f)} className="h-3.5 w-3.5 accent-brand" />
                    {o.fields[f]}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className={lbl}>{pl.fields.levels}</legend>
              <div className="flex flex-wrap gap-1.5">
                {ACADEMIC_LEVELS.map((l) => (
                  <label key={l} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-[12.5px] has-[:checked]:border-brand has-[:checked]:bg-brand-soft/50">
                    <input type="checkbox" name="targetLevels" value={l} defaultChecked={x.targetLevels.includes(l)} className="h-3.5 w-3.5 accent-brand" />
                    {o.academicLevel[l]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={lbl}>{pl.fields.start}</span>
                <input type="date" name="startDate" defaultValue={dateToForm(x.startDate)} className={field} />
              </label>
              <label className="block">
                <span className={lbl}>{pl.fields.end}</span>
                <input type="date" name="endDate" defaultValue={dateToForm(x.endDate)} className={field} />
              </label>
            </div>
            {(
              [
                ["preparationPlan", pl.fields.plan, x.preparationPlan],
                ["resources", pl.fields.resources, x.resources],
                ["notes", pl.fields.notes, x.notes],
                ["outcomes", pl.fields.outcomes, x.outcomes],
              ] as const
            ).map(([name, label, value]) => (
              <label key={name} className="block">
                <span className={lbl}>{label}</span>
                <textarea name={name} defaultValue={value} rows={3} className={area} dir="auto" />
              </label>
            ))}
            <div className="flex justify-end">
              <button className={buttonVariants({ size: "sm", className: "px-5" })}>{e.common.save}</button>
            </div>
          </form>
        </Section2>

        <div className="space-y-5">
          <Section2 title={pl.changeStatus}>
            <form action={changeInitiativeStatus.bind(null, x.id)} className="space-y-3">
              <select name="status" defaultValue={x.status} className={field} aria-label={pl.status}>
                {INITIATIVE_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {s.options.initiativeStatus[st]}
                  </option>
                ))}
              </select>
              <input name="note" placeholder={pl.statusNote} maxLength={500} className={field} />
              <div className="flex justify-end">
                <button className={buttonVariants({ variant: "outline", size: "sm" })}>{pl.changeStatus}</button>
              </div>
            </form>
            <h3 className="mt-5 mb-2 text-[13px] font-semibold">{pl.history}</h3>
            <ol className="space-y-1.5 text-[12.5px]">
              {x.statusChanges.map((c) => (
                <li key={c.id}>
                  <span className="text-muted">{i18n.dateTime(c.createdAt)}</span> · {c.fromStatus ? `${s.options.initiativeStatus[c.fromStatus]} → ` : ""}
                  <strong className="font-medium">{s.options.initiativeStatus[c.toStatus]}</strong>
                  {c.changedBy && <span className="text-muted"> · {c.changedBy.name}</span>}
                  {c.note && <span className="block text-muted">“{c.note}”</span>}
                </li>
              ))}
            </ol>
          </Section2>

          <Section2 title={pl.milestones}>
            {x.milestones.length === 0 && <p className="mb-3 text-[13px] text-muted">{pl.noMilestones}</p>}
            <ul className="mb-4 space-y-2">
              {x.milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-[13px]">
                  <span className={cn("flex-1", m.completedAt && "text-muted line-through")}>
                    {m.title}
                    {m.dueDate && <span className="text-muted"> · {pl.due} {i18n.date(m.dueDate)}</span>}
                  </span>
                  <form action={updateMilestone.bind(null, x.id, m.id)}>
                    <input type="hidden" name="action" value={m.completedAt ? "reopen" : "complete"} />
                    <button className={buttonVariants({ variant: "ghost", size: "sm" })}>{m.completedAt ? pl.reopen : pl.complete}</button>
                  </form>
                  <form action={updateMilestone.bind(null, x.id, m.id)}>
                    <input type="hidden" name="action" value="delete" />
                    <button className={buttonVariants({ variant: "ghost", size: "sm", className: "text-brand" })} aria-label={e.common.remove}>
                      ×
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            <form action={addMilestone.bind(null, x.id)} className="flex flex-wrap gap-2">
              <input name="title" placeholder={pl.milestoneTitle} required maxLength={200} className={cn(field, "min-w-0 flex-1")} />
              <input type="date" name="dueDate" aria-label={pl.due} className={cn(field, "w-auto")} />
              <button className={buttonVariants({ variant: "outline", size: "sm" })}>{e.common.add}</button>
            </form>
          </Section2>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Section2 title={pl.staff}>
          {x.staff.length === 0 ? (
            <p className="text-[13px] text-muted">{pl.noStaff}</p>
          ) : (
            <ul className="divide-y divide-line">
              {x.staff.map((st) => (
                <li key={st.profileId} className="py-2.5 first:pt-0">
                  <form action={updateInitiativeStaff.bind(null, x.id, st.profileId)} className="flex flex-wrap items-center gap-2 text-[13px]">
                    <Link href={`/admin/staff/${st.profileId}`} className="min-w-32 font-medium hover:text-brand hover:underline">
                      {st.profile.fullName}
                    </Link>
                    <input name="role" defaultValue={st.role} placeholder={pl.staffRole} maxLength={120} className={cn(field, "h-9 min-w-0 flex-1")} />
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" name="confirmed" defaultChecked={st.confirmed} className="h-4 w-4 accent-brand" />
                      {pl.confirmed}
                    </label>
                    <button className={buttonVariants({ variant: "outline", size: "sm" })}>{e.common.save}</button>
                    <button name="remove" value="1" className={buttonVariants({ variant: "ghost", size: "sm", className: "text-brand" })}>
                      {e.common.remove}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Section2>
        <Section2 title={pl.students}>
          {x.students.length === 0 ? (
            <p className="text-[13px] text-muted">{pl.noStudents}</p>
          ) : (
            <ul className="divide-y divide-line">
              {x.students.map((st) => (
                <li key={st.submissionId} className="py-2.5 first:pt-0">
                  <form action={updateInitiativeStudent.bind(null, x.id, st.submissionId)} className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="min-w-0 flex-1">
                      <Link href={`/admin/students/${st.submissionId}`} className="font-medium hover:text-brand hover:underline">
                        {st.submission.fullName}
                      </Link>{" "}
                      <span className="text-muted">
                        · {o.academicLevel[st.submission.academicLevel]} · {i18n.spec(st.submission.specialisation)}
                      </span>
                    </span>
                    <select name="status" defaultValue={st.status} className={cn(field, "h-9 w-auto")} aria-label={pl.status}>
                      {STUDENT_ASSIGNMENT_STATUSES.map((v) => (
                        <option key={v} value={v}>
                          {s.options.studentAssignment[v]}
                        </option>
                      ))}
                    </select>
                    <button className={buttonVariants({ variant: "outline", size: "sm" })}>{e.common.save}</button>
                    <button name="remove" value="1" className={buttonVariants({ variant: "ghost", size: "sm", className: "text-brand" })}>
                      {e.common.remove}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Section2>
      </div>

      <div className="mt-5">
        <MatchPanel
          i18n={i18n}
          {...match}
          hasFields={x.requiredFields.length > 0}
          initiativeId={x.id}
          addedStudents={x.students.map((st) => st.submissionId)}
          addedStaff={x.staff.map((st) => st.profileId)}
        />
      </div>
    </AdminShell>
  );
}
