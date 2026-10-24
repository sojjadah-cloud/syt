import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { FIELD_TO_EXPERTISE } from "@/config/staff";
import { TECHNICAL_FIELDS } from "@/config/survey";
import { getAdminI18n, type AdminI18n } from "@/lib/admin-i18n";
import type { RawParams } from "@/lib/admin-params";
import { audit, getAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { moduleWhere, opportunityWhere, projectWhere, staffWhere, workshopWhere } from "@/lib/engagement-queries";
import { csvSafe } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Table = { title: string; head: string[]; rows: (string | number)[][] };

const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "");

async function build(type: string, raw: RawParams, i: AdminI18n): Promise<Table | null> {
  const { e, s, o } = i;
  const j = (xs: string[]) => xs.join(i.locale === "ar" ? "، " : "; ");
  const lv = (xs: string[]) => j(xs.map((x) => o.academicLevel[x as keyof typeof o.academicLevel]));

  if (type === "opportunities") {
    const q = s.pathway.o;
    const rows = await prisma.scientificOpportunity.findMany({
      where: opportunityWhere(raw),
      include: { survey: { include: { pathways: true, profile: { select: { fullName: true } } } } },
      orderBy: { createdAt: "asc" },
    });
    return {
      title: e.opportunities.title,
      head: [q.name, q.type, e.opportunities.f.pathway, e.common.submittedBy, q.organiser, q.location, q.url, q.expectedDate, q.deadline, q.levels, q.participation, q.teamSize, q.requiredFields, q.requiredSkills, q.eligibility, q.preparation, q.preparationDuration, q.equipment, q.support, q.priority, e.common.reviewStatus, q.notes],
      rows: rows.map((r) => [
        r.name,
        s.options.opportunityTypes[r.type],
        j(r.survey.pathways.map((p) => i.spec(p.pathwayCode))),
        r.survey.profile.fullName,
        r.organiser,
        r.location,
        r.url,
        d(r.expectedDate),
        d(r.registrationDeadline),
        lv(r.targetLevels),
        s.options.participation[r.participation],
        r.teamSize ?? "",
        j(r.requiredFields.map((f) => o.fields[f])),
        r.requiredSkills,
        r.eligibility,
        r.preparation,
        r.preparationDuration,
        r.equipment,
        r.supportExpected,
        s.options.priority[r.priority],
        s.common.reviewStatus[r.reviewStatus],
        r.notes,
      ]),
    };
  }

  if (type === "pathways") {
    const surveys = await prisma.pathwaySurvey.findMany({
      where: { status: "SUBMITTED" },
      include: { pathways: true, profile: { select: { fullName: true } }, opportunities: true, recommendations: true },
    });
    const p = s.pathway;
    return {
      title: e.pathways.title,
      head: [e.opportunities.f.pathway, e.pathways.leaders, p.q2, p.q3, e.pathways.opportunities, e.pathways.competitions, p.q6, p.q7, p.q8, p.q9, p.q10, p.q11, p.q12],
      rows: surveys.map((x) => [
        j(x.pathways.map((y) => i.spec(y.pathwayCode))),
        x.profile.fullName,
        x.competencies,
        j(x.activityTypes.map((v) => s.options.activityTypes[v])),
        j(x.opportunities.map((y) => y.name)),
        j(x.opportunities.filter((y) => ["COMPETITION", "TECHNICAL_CHALLENGE", "HACKATHON", "INDUSTRY_CHALLENGE"].includes(y.type)).map((y) => y.name)),
        lv(x.targetLevels),
        x.preparationSkills,
        j(x.preparationMethods.map((v) => s.options.preparationMethods[v])),
        j(x.challenges.map((v) => s.options.challenges[v])),
        x.partners,
        j([...x.supportNeeded.map((v) => s.options.deptSupport[v]), ...(x.supportDetails ? [x.supportDetails] : [])]),
        j(x.recommendations.map((r) => `${r.name} (${s.options.priority[r.priority]}${r.period ? `, ${r.period}` : ""})`)),
      ]),
    };
  }

  if (type === "modules") {
    const surveys = await prisma.moduleSurvey.findMany({
      where: moduleWhere(raw),
      include: {
        profile: { select: { fullName: true } },
        outcomes: { orderBy: { sortOrder: "asc" } },
        activities: { orderBy: { sortOrder: "asc" }, include: { outcomes: { include: { outcome: true } } } },
      },
    });
    const m = s.module;
    // One row per activity (module rows repeated), so the Module → Outcome → Activity chain stays flat.
    return {
      title: e.modules.title,
      head: [m.q2, m.q1, e.modules.cols.coordinator, m.level, m.semester, e.modules.outcomes, m.a.title, m.a.type, e.modules.linked, e.modules.assessment, e.modules.resources, e.modules.timing, e.modules.potential, e.common.reviewStatus],
      rows: surveys.flatMap((x) => {
        const base = [
          x.moduleCode,
          x.moduleName,
          x.profile.fullName,
          x.level ? o.academicLevel[x.level] : "",
          s.options.semesters[x.semester as keyof typeof s.options.semesters] ?? x.semester,
          j(x.outcomes.map((y) => `${y.identifier}: ${y.description}`)),
        ];
        if (x.activities.length === 0) return [[...base, "", "", "", "", x.resources, "", "", ""]];
        return x.activities.map((a) => [
          ...base,
          a.title,
          s.options.moduleActivityTypes[a.type],
          j(a.outcomes.map((l) => l.outcome.identifier)),
          j([...a.assessmentMethods.map((v) => s.options.assessment[v]), ...(a.assessmentOther ? [a.assessmentOther] : [])]),
          j([a.resources, x.resources].filter(Boolean)),
          a.timing ? s.options.timing[a.timing] : "",
          a.competitionPotential ? s.options.competitionPotential[a.competitionPotential] : "",
          s.common.reviewStatus[a.reviewStatus],
        ]);
      }),
    };
  }

  if (type === "workshops") {
    const rows = await prisma.proposedWorkshop.findMany({ where: workshopWhere(raw), include: { survey: { select: { profile: { select: { fullName: true } } } } } });
    const w = s.contribution.w;
    return {
      title: e.workshops.title,
      head: [w.title, w.field, e.workshops.cols.staff, w.description, w.objectives, w.levels, w.prerequisites, w.maxParticipants, w.format, w.duration, w.equipment, w.venue, w.period, w.outcomes, e.common.reviewStatus],
      rows: rows.map((r) => [
        r.title,
        s.options.expertise[r.field],
        r.survey.profile.fullName,
        r.description,
        r.objectives,
        lv(r.levels),
        r.prerequisites,
        r.maxParticipants ?? "",
        r.format ? s.options.workshopFormat[r.format] : "",
        r.duration,
        r.equipment,
        r.venue,
        r.period,
        r.expectedOutcomes,
        s.common.reviewStatus[r.reviewStatus],
      ]),
    };
  }

  if (type === "research") {
    const rows = await prisma.proposedProject.findMany({ where: projectWhere(raw), include: { survey: { select: { profile: { select: { fullName: true } } } } } });
    const p = s.contribution.p;
    return {
      title: e.research.title,
      head: [p.title, p.field, e.research.cols.staff, p.problem, p.description, p.outcomes, p.requiredFields, p.requiredSkills, p.levels, p.studentCount, p.duration, p.resources, p.contributionType, p.publication, p.collaboration, e.common.reviewStatus],
      rows: rows.map((r) => [
        r.title,
        s.options.expertise[r.field],
        r.survey.profile.fullName,
        r.problem,
        r.description,
        r.expectedOutcomes,
        j(r.requiredFields.map((f) => o.fields[f])),
        r.requiredSkills,
        lv(r.levels),
        r.studentCount ?? "",
        r.duration,
        r.resources,
        r.contributionType ? s.options.contributionType[r.contributionType] : "",
        r.publicationOptions,
        r.collaboration,
        s.common.reviewStatus[r.reviewStatus],
      ]),
    };
  }

  if (type === "staff") {
    const profiles = await prisma.staffProfile.findMany({
      where: staffWhere(raw),
      include: {
        user: { select: { email: true } },
        pathways: true,
        contributions: { where: { status: "SUBMITTED" }, orderBy: { updatedAt: "desc" }, take: 1, include: { workshops: true, projects: true } },
      },
      orderBy: { fullName: "asc" },
    });
    const c = s.contribution;
    return {
      title: e.reports.staff,
      head: [e.staff.cols.name, e.staff.position, e.accounts.email, e.staff.pathways, c.q1, c.q2, c.workshop, c.project, c.q5, c.q6, c.q7, c.q8, c.q9, c.q10, c.q12],
      rows: profiles.map((p) => {
        const x = p.contributions[0];
        return [
          p.fullName,
          p.position,
          p.email ?? p.user?.email ?? "",
          j(p.pathways.map((y) => i.spec(y.pathwayCode))),
          x ? j(x.expertise.map((v) => (v === "OTHER" && x.expertiseOther ? x.expertiseOther : s.options.expertise[v]))) : "",
          x ? j(x.supportAreas.map((v) => s.options.supportAreas[v])) : "",
          x ? j(x.workshops.map((w) => w.title)) : "",
          x ? j(x.projects.map((w) => w.title)) : "",
          x?.mentorCompetitions ? `${s.options.mentor[x.mentorCompetitions]}${x.mentorFields.length ? ` (${j(x.mentorFields.map((v) => s.options.expertise[v]))})` : ""}` : "",
          x ? j(x.deliveryPreferences.map((v) => s.options.delivery[v])) : "",
          x ? lv(x.levels) : "",
          x?.duration ? s.options.duration[x.duration] : "",
          x ? j([...x.availability.map((v) => s.options.availability[v]), ...(x.availabilityNote ? [x.availabilityNote] : [])]) : "",
          x?.collaboration ? s.options.collaboration[x.collaboration] : "",
          x?.superviseExternal ? s.options.superviseExternal[x.superviseExternal] : "",
        ];
      }),
    };
  }

  if (type === "initiatives") {
    const rows = await prisma.initiative.findMany({
      include: {
        staff: { include: { profile: { select: { fullName: true } } } },
        students: { include: { submission: { select: { fullName: true } } } },
        milestones: true,
      },
      orderBy: { createdAt: "asc" },
    });
    const pl = e.planning;
    return {
      title: pl.title,
      head: [pl.fields.title, pl.status, pl.fields.pathway, pl.fields.requiredFields, pl.fields.levels, pl.staff, pl.students, pl.fields.plan, pl.fields.resources, pl.fields.start, pl.fields.end, pl.milestones, pl.fields.outcomes, pl.fields.notes],
      rows: rows.map((r) => [
        r.title,
        s.options.initiativeStatus[r.status],
        r.pathwayCode ? i.spec(r.pathwayCode) : "",
        j(r.requiredFields.map((f) => o.fields[f])),
        lv(r.targetLevels),
        j(r.staff.map((x) => `${x.profile.fullName}${x.role ? ` (${x.role})` : ""}${x.confirmed ? " ✓" : ""}`)),
        j(r.students.map((x) => `${x.submission.fullName} (${s.options.studentAssignment[x.status]})`)),
        r.preparationPlan,
        r.resources,
        d(r.startDate),
        d(r.endDate),
        j(r.milestones.map((m) => `${m.title}${m.dueDate ? ` (${d(m.dueDate)})` : ""}${m.completedAt ? " ✓" : ""}`)),
        r.outcomes,
        r.notes,
      ]),
    };
  }

  if (type === "integrated") {
    // Per technical field: opportunities needing it, student interest and self-rated skill, staff expertise, workshops.
    const [opps, studentFields, contribs, workshops] = await Promise.all([
      prisma.scientificOpportunity.findMany({ where: { survey: { status: "SUBMITTED" }, reviewStatus: { not: "DECLINED" } }, select: { name: true, requiredFields: true, expectedDate: true } }),
      prisma.submissionField.findMany({ select: { field: true, proficiency: true } }),
      prisma.contributionSurvey.findMany({ where: { status: "SUBMITTED" }, select: { expertise: true, mentorCompetitions: true, profileId: true } }),
      prisma.proposedWorkshop.findMany({ where: { survey: { status: "SUBMITTED" }, reviewStatus: { not: "DECLINED" } }, select: { title: true, field: true, period: true } }),
    ]);
    const m = e.matching;
    return {
      title: e.reports.integrated,
      head: [
        s.pathway.o.requiredFields,
        e.reports.pathway,
        e.overview.students,
        `${e.overview.students} < 3/5`,
        e.matching.staff,
        e.workshops.title,
        s.pathway.o.expectedDate,
      ],
      rows: TECHNICAL_FIELDS.filter((f) => f !== "OTHER")
        .map((f) => {
          const needing = opps.filter((x) => x.requiredFields.includes(f));
          const interested = studentFields.filter((x) => x.field === f);
          const areas = FIELD_TO_EXPERTISE[f];
          const staff = new Set(contribs.filter((c) => c.expertise.some((x) => areas.includes(x))).map((c) => c.profileId));
          const related = workshops.filter((w) => areas.includes(w.field));
          return [
            o.fields[f],
            j(needing.map((x) => x.name)),
            interested.length,
            interested.filter((x) => x.proficiency < 3).length,
            staff.size,
            j(related.map((w) => `${w.title}${w.period ? ` (${w.period})` : ""}`)) || m.trainingNone,
            j(needing.map((x) => d(x.expectedDate)).filter(Boolean)),
          ];
        })
        .filter((r) => r[1] !== "" || (r[2] as number) > 0),
    };
  }
  return null;
}

const csvCell = (v: string | number) => {
  const s = csvSafe(String(v));
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const i18n = await getAdminI18n();
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const type = raw.type ?? "";
  const table = await build(type, raw, i18n);
  if (!table) return NextResponse.json({ error: "unknown_report" }, { status: 400 });
  const format = raw.format === "xlsx" ? "xlsx" : "csv";
  await audit(admin.id, "report_export", `${type} ${format} rows=${table.rows.length}`);

  const stamp = new Date().toISOString().slice(0, 10);
  const name = `se-${type}-${stamp}`;
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (format === "csv") {
    const lines = [table.head.map(csvCell).join(","), ...table.rows.map((r) => r.map(csvCell).join(","))];
    return new NextResponse("﻿" + lines.join("\r\n"), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"` },
    });
  }
  const wb = new ExcelJS.Workbook();
  wb.creator = "Systems Engineering Department";
  const ws = wb.addWorksheet(table.title.slice(0, 31), { views: [{ state: "frozen", ySplit: 1, rightToLeft: i18n.locale === "ar" }] });
  ws.columns = table.head.map((h) => ({ header: h, width: Math.min(50, Math.max(14, h.length + 4)) }));
  for (const r of table.rows) ws.addRow(r.map((v) => (typeof v === "string" ? csvSafe(v) : v)));
  ws.getRow(1).font = { bold: true };
  if (table.head.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: table.head.length } };
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${name}.xlsx"` },
  });
}
