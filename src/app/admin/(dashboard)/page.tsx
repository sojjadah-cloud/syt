import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminShell,
  ColumnLabels,
  Columns,
  Empty,
  Kpi,
  PageHeader,
  Panel,
  ProficiencyLegend,
  ProficiencyStack,
  RankedBars,
  Section,
} from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import {
  ACADEMIC_LEVELS,
  BARRIERS,
  EXPERIENCE_TYPES,
  INTEREST_ACTIVITIES,
  ISE_TRACKS,
  PROFICIENCY_LEVELS,
  READINESS,
  SPECIALISATIONS,
  SUPPORT_TYPES,
  TEAM_ROLES,
  WEEKLY_HOURS,
} from "@/config/survey";
import { getAnalytics } from "@/lib/admin-data";
import { getAdminI18n, specWithTrack } from "@/lib/admin-i18n";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard | SE Survey Admin" };

function rows<K extends string>(keys: readonly K[], counts: Partial<Record<K, number>>, labels: Record<K, string>) {
  return keys.map((k) => ({ label: labels[k], value: counts[k] ?? 0 }));
}

export default async function AdminOverview() {
  const [admin, i18n, a] = await Promise.all([requireAdmin(), getAdminI18n(), getAnalytics()]);
  const { t, o, format } = i18n;
  const ov = t.overview;
  const n = a.total;
  const pct = (v: number) => (n ? Math.round((v / n) * 100) : 0);
  const ready = (a.readiness.VERY_READY ?? 0) + (a.readiness.SCHEDULE_DEPENDENT ?? 0);
  const fivePlus = (a.hours.H5_7 ?? 0) + (a.hours.GT_7 ?? 0);
  const iseTotal = Object.values(a.iseTrack).reduce<number>((x, y) => x + (y ?? 0), 0);
  const profLabels = PROFICIENCY_LEVELS.map((l) => o.proficiency[l]);

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="overview">
      <PageHeader
        title={ov.title}
        subtitle={
          <>
            {ov.subtitle}{" "}
            <span className="whitespace-nowrap">
              · {a.latestAt ? `${ov.lastResponse}: ${i18n.dateTime(a.latestAt)}` : ov.noResponses}
            </span>
          </>
        }
        actions={
          <>
            <Link href="/admin/students" className={buttonVariants({ variant: "outline", size: "sm" })}>
              {ov.viewStudents}
            </Link>
            <a href="/api/admin/export?format=xlsx" className={buttonVariants({ size: "sm" })}>
              {ov.exportExcel}
            </a>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi accent label={ov.kpi.total} value={n} sub={format(ov.kpi.totalSub, { week: a.week })} />
        <Kpi label={ov.kpi.ready} value={n ? `${pct(ready)}%` : "—"} sub={`${ready} · ${ov.kpi.readySub}`} />
        <Kpi label={ov.kpi.training} value={a.readiness.NEEDS_TRAINING ?? 0} sub={ov.kpi.trainingSub} />
        <Kpi label={ov.kpi.hours} value={fivePlus} sub={format(ov.kpi.hoursSub, { percent: pct(fivePlus) })} />
      </div>
      <p className="mt-3 text-[12.5px] text-muted">{ov.note}</p>

      <Section title={ov.sections.profile}>
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title={ov.panels.level}>
            <Columns total={n} empty={ov.empty} rows={rows(ACADEMIC_LEVELS, a.level, o.academicLevel)} />
            {n > 0 && <ColumnLabels labels={ACADEMIC_LEVELS.map((l) => o.academicLevel[l])} />}
          </Panel>
          <Panel title={ov.panels.spec} className="lg:col-span-2">
            <RankedBars
              total={n}
              empty={ov.empty}
              rows={SPECIALISATIONS.map((s) => ({ label: i18n.spec(s.value), value: a.spec[s.value] ?? 0 })).filter((r) => r.value > 0)}
            />
          </Panel>
          {iseTotal > 0 && (
            <Panel title={ov.panels.ise} note={format(ov.panels.iseNote, { count: iseTotal })} className="lg:col-span-3">
              <div className="max-w-2xl">
                <RankedBars sort={false} total={iseTotal} empty={ov.empty} rows={rows(ISE_TRACKS, a.iseTrack, o.iseTrack)} />
              </div>
            </Panel>
          )}
        </div>
      </Section>

      <Section title={ov.sections.interests}>
        <div className="grid gap-4 lg:grid-cols-5">
          <Panel title={ov.panels.interests} className="lg:col-span-2">
            <RankedBars total={n} empty={ov.empty} rows={rows(INTEREST_ACTIVITIES, a.interests, o.interests)} />
          </Panel>
          <Panel title={ov.panels.skills} className="lg:col-span-3">
            {a.skill.length === 0 ? (
              <Empty text={ov.empty} />
            ) : (
              <>
                <ProficiencyLegend labels={profLabels} />
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-[13px]">
                    <thead>
                      <tr className="border-b border-line text-start text-[12px] text-muted">
                        <th className="pb-2 text-start font-medium">{ov.skills.field}</th>
                        <th className="w-16 pb-2 text-end font-medium">{ov.skills.students}</th>
                        <th className="w-20 pb-2 text-end font-medium">{ov.skills.avg}</th>
                        <th className="w-[42%] pb-2 ps-5 text-start font-medium">{ov.skills.dist}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {a.skill.map((s) => (
                        <tr key={s.field}>
                          <td className="py-2.5 pe-3 text-ink">{o.fields[s.field]}</td>
                          <td className="py-2.5 text-end tabular-nums">{s.n}</td>
                          <td className="py-2.5 text-end tabular-nums">{s.avg.toFixed(1)}</td>
                          <td className="py-2.5 ps-5">
                            <ProficiencyStack dist={s.dist} labels={profLabels} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Panel>
        </div>
      </Section>

      <Section title={ov.sections.readiness}>
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title={ov.panels.readiness}>
            <RankedBars sort={false} total={n} empty={ov.empty} rows={rows(READINESS, a.readiness, o.readiness)} />
          </Panel>
          <Panel title={ov.panels.hours}>
            <Columns total={n} empty={ov.empty} rows={rows(WEEKLY_HOURS, a.hours, o.weeklyHours)} />
            {n > 0 && <ColumnLabels labels={WEEKLY_HOURS.map((h) => o.weeklyHours[h])} />}
          </Panel>
          <Panel title={ov.panels.roles}>
            <RankedBars total={n} empty={ov.empty} rows={rows(TEAM_ROLES, a.role, o.teamRole)} />
          </Panel>
        </div>
      </Section>

      <Section title={ov.sections.development}>
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title={ov.panels.barriers}>
            <RankedBars total={n} empty={ov.empty} rows={rows(BARRIERS, a.barriers, o.barriers)} />
          </Panel>
          <Panel title={ov.panels.support}>
            <RankedBars total={n} empty={ov.empty} rows={rows(SUPPORT_TYPES, a.supports, o.support)} />
          </Panel>
          <Panel title={ov.panels.experience}>
            <RankedBars total={n} empty={ov.empty} rows={rows(EXPERIENCE_TYPES, a.experiences, o.experience)} />
          </Panel>
        </div>
      </Section>

      <Section
        title={ov.sections.latest}
        action={
          n > 0 ? (
            <Link href="/admin/students" className="text-[13px] font-medium text-brand hover:underline">
              {ov.seeAll}
            </Link>
          ) : undefined
        }
      >
        {a.recent.length === 0 ? (
          <Empty text={ov.empty} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <ul className="divide-y divide-line">
              {a.recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/students/${r.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3 hover:bg-canvas/60">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink">
                        {r.fullName}
                      </span>
                      <span className="block font-mono text-[12px] text-muted">
                        {r.studentId}
                      </span>
                    </span>
                    <span className="text-[13px] text-ink sm:w-64">{specWithTrack(i18n, r)}</span>
                    <span className="text-[13px] text-muted sm:w-20">{o.academicLevel[r.academicLevel]}</span>
                    <span className="text-[13px] text-muted sm:w-28">{i18n.date(r.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>
    </AdminShell>
  );
}
