import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { buildWhere, parseFilters, submissionInclude, type FullSubmission } from "@/lib/admin-data";
import { getAdminI18n, type AdminI18n } from "@/lib/admin-i18n";
import { audit, getAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { csvSafe } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Col = [string, (s: FullSubmission) => string | number];

function columns(i: AdminI18n): Col[] {
  const { o } = i;
  const h = i.t.export;
  const join = (xs: string[]) => xs.join(i.locale === "ar" ? "، " : "; ");
  return [
    [h.reference, (s) => s.referenceNo],
    [h.submitted, (s) => s.createdAt.toISOString()],
    [h.fullName, (s) => s.fullName],
    [h.studentId, (s) => s.studentId],
    [h.level, (s) => o.academicLevel[s.academicLevel]],
    [h.spec, (s) => i.spec(s.specialisation)],
    [h.track, (s) => i.track(s)],
    [h.interests, (s) => join(s.interests.map((x) => o.interests[x.activity]))],
    [h.fields, (s) => join(s.fields.map(i.field))],
    [h.proficiency, (s) => join(s.fields.map((f) => `${i.field(f)}: ${f.proficiency}`))],
    [h.experience, (s) => join(s.experiences.map((e) => o.experience[e.experience]))],
    [h.skills, (s) => s.skillsAndTools],
    [h.achievements, (s) => s.achievements ?? ""],
    [h.readiness, (s) => o.readiness[s.readiness]],
    [h.hours, (s) => o.weeklyHours[s.weeklyHours]],
    [h.role, (s) => o.teamRole[s.teamRole]],
    [h.barriers, (s) => join(s.barriers.map((b) => o.barriers[b.barrier]))],
    [h.support, (s) => join(s.supports.map((x) => o.support[x.support]))],
    [h.language, (s) => s.locale],
  ];
}

const csvCell = (v: string | number) => {
  const s = csvSafe(String(v));
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const i18n = await getAdminI18n();
  const COLUMNS = columns(i18n);
  const filters = parseFilters(req.nextUrl.searchParams);
  const format = req.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const rows = await prisma.submission.findMany({ where: buildWhere(filters), orderBy: { createdAt: "asc" }, include: submissionInclude });
  await audit(admin.id, "export", `${format} rows=${rows.length} filters=${JSON.stringify(filters)}`);

  const stamp = new Date().toISOString().slice(0, 10);
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

  if (format === "csv") {
    const lines = [COLUMNS.map(([h]) => csvCell(h)).join(","), ...rows.map((r) => COLUMNS.map(([, get]) => csvCell(get(r))).join(","))];
    return new NextResponse("﻿" + lines.join("\r\n"), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="se-survey-responses-${stamp}.csv"` },
    });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Systems Engineering Department";
  const ws = wb.addWorksheet(i18n.t.export.sheet, { views: [{ state: "frozen", ySplit: 1, rightToLeft: i18n.locale === "ar" }] });
  ws.columns = COLUMNS.map(([h]) => ({ header: h, width: Math.min(48, Math.max(14, h.length + 4)) }));
  for (const r of rows) ws.addRow(COLUMNS.map(([, get]) => { const v = get(r); return typeof v === "string" ? csvSafe(v) : v; }));
  ws.getRow(1).font = { bold: true };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      ...headers,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="se-survey-responses-${stamp}.xlsx"`,
    },
  });
}
