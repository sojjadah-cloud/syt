import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/ui";
import { submissionInclude } from "@/lib/admin-data";
import { getAdminI18n } from "@/lib/admin-i18n";
import { audit, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Student profile | SE Survey Admin" };

function Row({ q, label, children }: { q: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-3.5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-6">
      <dt className="text-[13px] text-muted">
        <span className="me-1.5 tabular-nums">{q}</span>
        {label}
      </dt>
      <dd className="text-[14px] text-ink">{children}</dd>
    </div>
  );
}

const List = ({ items }: { items: string[] }) =>
  items.length ? (
    <ul className="space-y-1">
      {items.map((i) => (
        <li key={i} dir="auto">
          {i}
        </li>
      ))}
    </ul>
  ) : (
    <span className="text-muted">—</span>
  );

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-line bg-white shadow-card ${className ?? ""}`}>
      <h2 className="border-b border-line bg-canvas/60 px-5 py-3 text-[14px] font-semibold">{title}</h2>
      <dl className="divide-y divide-line">{children}</dl>
    </section>
  );
}

export default async function StudentProfile({ params }: { params: Promise<{ id: string }> }) {
  const [admin, i18n] = await Promise.all([requireAdmin(), getAdminI18n()]);
  const { t, o } = i18n;
  const p = t.profile;
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  const s = await prisma.submission.findUnique({ where: { id }, include: submissionInclude });
  if (!s) notFound();
  await audit(admin.id, "view_profile", s.referenceNo);
  const track = i18n.track(s);

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="students">
      <Link href="/admin/students" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
        <span aria-hidden className="rtl:rotate-180">←</span> {p.back}
      </Link>

      <div className="mt-4 mb-6 rounded-2xl border border-line bg-white p-5 shadow-card md:p-6">
        <h1 className="text-[24px] font-semibold leading-tight">
          {s.fullName}
        </h1>
        <dl className="mt-4 grid gap-4 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
          {[
            [p.studentId, <span key="id" className="font-mono">{s.studentId}</span>],
            [p.reference, <span key="ref" className="font-mono">{s.referenceNo}</span>],
            [p.submitted, i18n.dateTime(s.createdAt)],
            [p.language, s.locale === "ar" ? p.langAr : p.langEn],
          ].map(([label, value], k) => (
            <div key={k}>
              <dt className="text-muted">{label}</dt>
              <dd className="mt-0.5 font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={p.academic}>
          <Row q="3" label={p.q.level}>{o.academicLevel[s.academicLevel]}</Row>
          <Row q="4" label={p.q.spec}>
            {i18n.spec(s.specialisation)}
            {track && <div className="mt-0.5 text-[13px] text-muted">{p.q.track}: {track}</div>}
          </Row>
          <Row q="5" label={p.q.interests}><List items={s.interests.map((x) => o.interests[x.activity])} /></Row>
          <Row q="6–7" label={p.q.fields}>
            <List items={s.fields.map((f) => `${i18n.field(f)} — ${f.proficiency} · ${o.proficiency[f.proficiency as 1]}`)} />
          </Row>
        </Card>
        <Card title={p.experience}>
          <Row q="8" label={p.q.experience}><List items={s.experiences.map((e) => o.experience[e.experience])} /></Row>
          <Row q="9" label={p.q.skills}><span dir="auto" className="whitespace-pre-line break-words">{s.skillsAndTools}</span></Row>
          <Row q="10" label={p.q.achievements}>
            {s.achievements ? <span dir="auto" className="whitespace-pre-line break-words">{s.achievements}</span> : <span className="text-muted">—</span>}
          </Row>
          <Row q="11" label={p.q.readiness}>{o.readiness[s.readiness]}</Row>
          <Row q="12" label={p.q.hours}>{o.weeklyHours[s.weeklyHours]}</Row>
          <Row q="13" label={p.q.role}>{o.teamRole[s.teamRole]}</Row>
        </Card>
        <Card title={p.development} className="lg:col-span-2">
          <Row q="14" label={p.q.barriers}><List items={s.barriers.map((b) => o.barriers[b.barrier])} /></Row>
          <Row q="15" label={p.q.support}><List items={s.supports.map((x) => o.support[x.support])} /></Row>
        </Card>
      </div>
    </AdminShell>
  );
}
