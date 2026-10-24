import Link from "next/link";
import { REVIEW_STATUSES } from "@/config/staff";
import { buttonVariants } from "@/components/ui/button";
import { inputBase } from "@/components/ui/input";
import type { AdminI18n } from "@/lib/admin-i18n";
import { addInitiativeStaff, addInitiativeStudent, createInitiative, setReviewStatus } from "@/lib/admin-actions";
import type { StaffMatch, StudentMatch, TrainingNeed } from "@/lib/matching";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string };
export const toOpts = <K extends string>(keys: readonly K[], labels: Record<K, string>): Option[] => keys.map((k) => ({ value: k, label: labels[k] }));

/** GET filter form (server-rendered, works without JavaScript). */
export function FilterBar({
  i18n,
  action,
  q,
  qLabel,
  selects,
  extra,
}: {
  i18n: AdminI18n;
  action: string;
  q?: string;
  qLabel: string;
  selects: { name: string; label: string; value?: string; options: Option[] }[];
  extra?: React.ReactNode;
}) {
  const c = i18n.e.common;
  const active = selects.filter((s) => s.value).length + (q ? 1 : 0);
  return (
    <form method="get" action={action} className="mb-5 rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[14px] font-semibold">{c.filters}</h2>
        {active > 0 && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[12px] font-medium text-brand-deep">{active}</span>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block sm:col-span-2 lg:col-span-1">
          <span className="mb-1.5 block text-[12.5px] font-medium text-muted">{c.search}</span>
          <input name="q" defaultValue={q} placeholder={qLabel} className={cn(inputBase, "h-10 px-3 text-[13.5px]")} />
        </label>
        {selects.map((s) => (
          <label key={s.name} className="block min-w-0">
            <span className="mb-1.5 block text-[12.5px] font-medium text-muted">{s.label}</span>
            <select
              name={s.name}
              defaultValue={s.value ?? ""}
              className={cn(inputBase, "h-10 truncate px-3 text-[13.5px]", s.value && "border-brand/50 bg-brand-soft/40")}
            >
              <option value="">{c.all}</option>
              {s.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {extra}
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
        <Link href={action} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          {c.clear}
        </Link>
        <button className={buttonVariants({ size: "sm", className: "px-5" })}>{c.apply}</button>
      </div>
    </form>
  );
}

export function DateRange({ i18n, label, from, to }: { i18n: AdminI18n; label: string; from?: string; to?: string }) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-muted">{label}</span>
      <div className="flex gap-2">
        <input type="date" name="from" defaultValue={from} aria-label={i18n.e.common.from} className={cn(inputBase, "h-10 px-2 text-[13px]")} />
        <input type="date" name="to" defaultValue={to} aria-label={i18n.e.common.to} className={cn(inputBase, "h-10 px-2 text-[13px]")} />
      </div>
    </div>
  );
}

const REVIEW_TONE: Record<string, string> = {
  PENDING: "border-gold/40 bg-gold-soft text-[#7a6219]",
  UNDER_REVIEW: "border-blue-200 bg-blue-50 text-blue-800",
  APPROVED: "border-green-200 bg-green-50 text-green-800",
  DECLINED: "border-line bg-canvas text-muted",
  // Initiative statuses
  PROPOSED: "border-gold/40 bg-gold-soft text-[#7a6219]",
  IN_PREPARATION: "border-blue-200 bg-blue-50 text-blue-800",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-800",
  COMPLETED: "border-green-200 bg-green-50 text-green-800",
  CANCELLED: "border-line bg-canvas text-muted",
  // Assignment statuses
  SUGGESTED: "border-gold/40 bg-gold-soft text-[#7a6219]",
  INVITED: "border-blue-200 bg-blue-50 text-blue-800",
  CONFIRMED: "border-green-200 bg-green-50 text-green-800",
  WITHDRAWN: "border-line bg-canvas text-muted",
};

export function Badge({ status, label }: { status: string; label: string }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[12px] leading-snug", REVIEW_TONE[status] ?? "border-line bg-canvas")}>{label}</span>;
}

export function Chips({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-muted">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((x) => (
        <span key={x} className="rounded-md bg-canvas px-1.5 py-0.5 text-[12px] text-ink">
          {x}
        </span>
      ))}
    </span>
  );
}

/** Review status control for a submitted item (server action). */
export function ReviewControl({ i18n, kind, id, status }: { i18n: AdminI18n; kind: "opportunity" | "workshop" | "project" | "activity"; id: string; status: string }) {
  const s = i18n.s.common.reviewStatus;
  return (
    <form action={setReviewStatus.bind(null, kind, id)} className="flex items-center gap-2">
      <select name="status" defaultValue={status} aria-label={i18n.e.common.reviewStatus} className={cn(inputBase, "h-9 w-auto px-2 text-[13px]")}>
        {REVIEW_STATUSES.map((r) => (
          <option key={r} value={r}>
            {s[r]}
          </option>
        ))}
      </select>
      <button className={buttonVariants({ variant: "outline", size: "sm" })}>{i18n.e.common.updateReview}</button>
    </form>
  );
}

export function CreateInitiativeButton({ i18n, source, sourceId }: { i18n: AdminI18n; source: "opportunity" | "workshop" | "project" | "activity"; sourceId: string }) {
  return (
    <form action={createInitiative}>
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="sourceId" value={sourceId} />
      <button className={buttonVariants({ size: "sm" })}>{i18n.e.common.createInitiative}</button>
    </form>
  );
}

export function ExportLinks({ i18n, type, qs }: { i18n: AdminI18n; type: string; qs?: string }) {
  const base = `/api/admin/report?type=${type}${qs ? `&${qs}` : ""}`;
  return (
    <>
      <a href={`${base}&format=csv`} className={buttonVariants({ variant: "outline", size: "sm" })}>
        {i18n.e.common.exportCsv}
      </a>
      <a href={`${base}&format=xlsx`} className={buttonVariants({ size: "sm" })}>
        {i18n.e.common.exportExcel}
      </a>
    </>
  );
}

export function Section2({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas/60 px-5 py-3">
        <h2 className="text-[14px] font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y divide-line">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-1 py-2.5 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-6">
          <dt className="text-[13px] text-muted">{k}</dt>
          <dd className="whitespace-pre-line break-words text-[14px]">{v === "" || v == null ? <span className="text-muted">—</span> : v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Explainable suggestions for an opportunity or initiative. Optional "Add" buttons for initiatives. */
export function MatchPanel({
  i18n,
  students,
  staff,
  training,
  hasFields,
  initiativeId,
  addedStudents = [],
  addedStaff = [],
}: {
  i18n: AdminI18n;
  students: StudentMatch[];
  staff: StaffMatch[];
  training: TrainingNeed[];
  hasFields: boolean;
  initiativeId?: string;
  addedStudents?: string[];
  addedStaff?: string[];
}) {
  const m = i18n.e.matching;
  const { o, s, format } = i18n;
  const join = (xs: string[]) => xs.join(i18n.locale === "ar" ? "، " : ", ");
  return (
    <Section2 title={m.title}>
      <p className="rounded-lg border border-gold/40 bg-gold-soft/70 px-3 py-2 text-[12.5px] leading-relaxed">{m.disclaimer}</p>
      <details className="mt-2 text-[12.5px] text-muted">
        <summary className="cursor-pointer">{m.reasons}</summary>
        <p className="mt-1 leading-relaxed">{m.rules}</p>
      </details>
      {!hasFields ? (
        <p className="mt-4 text-[13.5px] text-muted">{m.noFields}</p>
      ) : (
        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div>
            <h3 className="mb-2 text-[14px] font-semibold">{m.students}</h3>
            {students.length === 0 ? (
              <p className="text-[13px] text-muted">{m.noStudents}</p>
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {students.map((st) => (
                  <li key={st.submissionId} className="flex items-start gap-3 px-3 py-2.5">
                    <span className="mt-0.5 w-10 shrink-0 rounded-md bg-canvas py-1 text-center text-[13px] font-semibold tabular-nums" title={m.score}>
                      {st.score}
                    </span>
                    <div className="min-w-0 flex-1 text-[13px]">
                      <Link href={`/admin/students/${st.submissionId}`} className="font-medium text-ink hover:text-brand hover:underline">
                        {st.fullName}
                      </Link>{" "}
                      <span className="font-mono text-[12px] text-muted">{st.studentId}</span>
                      <p className="mt-0.5 leading-relaxed text-muted">
                        {[
                          format(m.interest, { fields: join(st.matched.map((f) => `${o.fields[f.field]} (${format(m.proficiency, { value: f.proficiency })})`)) }),
                          format(m.readiness, { value: o.readiness[st.readiness] }),
                          format(m.hours, { value: o.weeklyHours[st.hours] }),
                          o.academicLevel[st.level],
                          st.experiences.length ? format(m.experience, { value: join(st.experiences.map((e) => o.experience[e as keyof typeof o.experience])) }) : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {initiativeId &&
                      (addedStudents.includes(st.submissionId) ? (
                        <span className="shrink-0 text-[12px] text-success">{m.added}</span>
                      ) : (
                        <form action={addInitiativeStudent.bind(null, initiativeId, st.submissionId)}>
                          <button className={buttonVariants({ variant: "outline", size: "sm" })}>{m.addStudent}</button>
                        </form>
                      ))}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-[14px] font-semibold">{m.staff}</h3>
              {staff.length === 0 ? (
                <p className="text-[13px] text-muted">{m.noStaff}</p>
              ) : (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {staff.map((p) => (
                    <li key={p.profileId} className="flex items-start gap-3 px-3 py-2.5 text-[13px]">
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/staff/${p.profileId}`} className="font-medium hover:text-brand hover:underline">
                          {p.fullName}
                        </Link>
                        <span className="text-muted"> · {p.position}</span>
                        <p className="mt-0.5 leading-relaxed text-muted">
                          {[
                            p.expertise.length ? format(m.expertise, { value: join(p.expertise.map((x) => s.options.expertise[x])) }) : "",
                            p.mentor ? format(m.mentor, { value: s.options.mentor[p.mentor as keyof typeof s.options.mentor] }) : "",
                            p.superviseExternal ? format(m.supervise, { value: s.options.superviseExternal[p.superviseExternal as keyof typeof s.options.superviseExternal] }) : "",
                            p.workshops.length ? format(m.relatedWorkshops, { value: join(p.workshops) }) : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {initiativeId &&
                        (addedStaff.includes(p.profileId) ? (
                          <span className="shrink-0 text-[12px] text-success">{m.added}</span>
                        ) : (
                          <form action={addInitiativeStaff.bind(null, initiativeId, p.profileId)}>
                            <button className={buttonVariants({ variant: "outline", size: "sm" })}>{m.addStaff}</button>
                          </form>
                        ))}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-[14px] font-semibold">{m.training}</h3>
              <ul className="space-y-2 text-[13px]">
                {training.map((n) => (
                  <li key={n.field} className="rounded-lg border border-line px-3 py-2">
                    <p>{format(m.trainingLine, { field: o.fields[n.field], weak: n.weak, total: n.total })}</p>
                    <p className="mt-0.5 text-muted">{n.workshops.length ? format(m.trainingWorkshops, { value: join(n.workshops) }) : m.trainingNone}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Section2>
  );
}
