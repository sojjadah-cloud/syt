"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import type { AcademicLevel, InitiativeStatus, StaffRole, StudentAssignmentStatus, TechnicalField } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { INITIATIVE_STATUSES, REVIEW_STATUSES, STUDENT_ASSIGNMENT_STATUSES } from "@/config/staff";
import { ACADEMIC_LEVELS, SPECIALISATIONS, TECHNICAL_FIELDS } from "@/config/survey";
import { audit, requireAdmin } from "./auth";
import { prisma } from "./db";
import { sanitizeText } from "./sanitize";

const str = (fd: FormData, k: string, max = 200, multiline = false) => sanitizeText(String(fd.get(k) ?? ""), multiline).slice(0, max);
const pick = <T extends readonly string[]>(list: T, v: unknown): T[number] | null =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T[number]) : null;
const pickAll = <T extends readonly string[]>(list: T, vs: unknown[]) => [...new Set(vs.map((v) => pick(list, v)).filter((v): v is T[number] => !!v))];
const date = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? new Date(`${v}T00:00:00Z`) : null);
const tempPassword = () => randomBytes(12).toString("base64url");
const isId = (v: string) => /^[a-z0-9]{10,40}$/i.test(v);

// ---------------------------------------------------------------------------
// Accounts & roles (administrator-approved role assignment)
// ---------------------------------------------------------------------------

export type AccountState = { ok?: boolean; error?: "exists" | "invalid" | "self"; password?: string; email?: string } | null;

export async function createAccount(_: AccountState, fd: FormData): Promise<AccountState> {
  const admin = await requireAdmin();
  const name = str(fd, "name", 120);
  const email = str(fd, "email", 200).toLowerCase();
  // Accounts are for department administrators only; staff use the open forms.
  const roles: StaffRole[] = ["ADMIN"];
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "invalid" };
  if (await prisma.adminUser.findUnique({ where: { email } })) return { error: "exists" };
  const password = tempPassword();
  await prisma.adminUser.create({ data: { name, email, roles, mustChangePassword: true, passwordHash: await bcrypt.hash(password, 12) } });
  await audit(admin.id, "account_created", `${email} roles=${roles.join(",")}`);
  revalidatePath("/admin/staff/accounts");
  return { ok: true, password, email };
}

export async function setAccountActive(userId: string, active: boolean) {
  const admin = await requireAdmin();
  if (!isId(userId) || userId === admin.id) return;
  await prisma.adminUser.update({ where: { id: userId }, data: { active } });
  await audit(admin.id, active ? "account_activated" : "account_deactivated", userId);
  revalidatePath("/admin/staff/accounts");
}

export async function resetPassword(userId: string, _: AccountState): Promise<AccountState> {
  const admin = await requireAdmin();
  if (!isId(userId) || userId === admin.id) return { error: "self" };
  const password = tempPassword();
  const u = await prisma.adminUser.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true },
    select: { email: true },
  });
  await audit(admin.id, "password_reset", userId);
  return { ok: true, password, email: u.email };
}

// ---------------------------------------------------------------------------
// Review of submitted items
// ---------------------------------------------------------------------------

const REVIEWABLE = ["opportunity", "workshop", "project", "activity"] as const;

export async function setReviewStatus(kind: (typeof REVIEWABLE)[number], id: string, fd: FormData) {
  const admin = await requireAdmin();
  const status = pick(REVIEW_STATUSES, fd.get("status"));
  if (!status || !isId(id) || !REVIEWABLE.includes(kind)) return;
  const data = { reviewStatus: status };
  if (kind === "opportunity") await prisma.scientificOpportunity.update({ where: { id }, data });
  if (kind === "workshop") await prisma.proposedWorkshop.update({ where: { id }, data });
  if (kind === "project") await prisma.proposedProject.update({ where: { id }, data });
  if (kind === "activity") await prisma.moduleActivity.update({ where: { id }, data });
  await audit(admin.id, "review_status", `${kind}:${id} → ${status}`);
  revalidatePath("/admin", "layout");
}

// ---------------------------------------------------------------------------
// Scientific planning — initiatives
// ---------------------------------------------------------------------------

/** Creates a PROPOSED initiative, pre-filled from a reviewed submission (or blank). */
export async function createInitiative(fd: FormData) {
  const admin = await requireAdmin();
  const source = pick(["opportunity", "workshop", "project", "activity", "none"] as const, fd.get("source")) ?? "none";
  const sourceId = str(fd, "sourceId", 40);
  let data: {
    title: string;
    pathwayCode?: string | null;
    opportunityId?: string;
    workshopId?: string;
    projectId?: string;
    moduleActivityId?: string;
    requiredFields?: TechnicalField[];
    targetLevels?: AcademicLevel[];
    resources?: string;
    preparationPlan?: string;
  } = { title: str(fd, "title", 200) || "New initiative" };

  if (source !== "none" && isId(sourceId)) {
    if (source === "opportunity") {
      const o = await prisma.scientificOpportunity.findUniqueOrThrow({ where: { id: sourceId }, include: { survey: { include: { pathways: true } } } });
      data = {
        title: o.name,
        opportunityId: o.id,
        pathwayCode: o.survey.pathways[0]?.pathwayCode ?? null,
        requiredFields: o.requiredFields,
        targetLevels: o.targetLevels,
        resources: [o.equipment, o.supportExpected].filter(Boolean).join("\n"),
        preparationPlan: o.preparation,
      };
    } else if (source === "workshop") {
      const w = await prisma.proposedWorkshop.findUniqueOrThrow({ where: { id: sourceId } });
      data = { title: w.title, workshopId: w.id, targetLevels: w.levels, resources: [w.equipment, w.venue].filter(Boolean).join("\n") };
    } else if (source === "project") {
      const p = await prisma.proposedProject.findUniqueOrThrow({ where: { id: sourceId } });
      data = { title: p.title, projectId: p.id, requiredFields: p.requiredFields, targetLevels: p.levels, resources: p.resources };
    } else if (source === "activity") {
      const a = await prisma.moduleActivity.findUniqueOrThrow({ where: { id: sourceId }, include: { survey: true } });
      data = { title: a.title, moduleActivityId: a.id, targetLevels: a.survey.level ? [a.survey.level] : [], resources: a.resources };
    }
  }
  const created = await prisma.initiative.create({
    data: { ...data, createdById: admin.id, statusChanges: { create: { toStatus: "PROPOSED", changedById: admin.id } } },
  });
  await audit(admin.id, "initiative_created", `${created.id} from ${source}:${sourceId}`);
  redirect(`/admin/scientific-planning/${created.id}`);
}

export async function updateInitiative(id: string, fd: FormData) {
  const admin = await requireAdmin();
  if (!isId(id)) return;
  const pathway = String(fd.get("pathwayCode") ?? "");
  await prisma.initiative.update({
    where: { id },
    data: {
      title: str(fd, "title", 200) || "Untitled initiative",
      pathwayCode: SPECIALISATIONS.some((s) => s.value === pathway) ? pathway : null,
      requiredFields: pickAll(TECHNICAL_FIELDS, fd.getAll("requiredFields")) as TechnicalField[],
      targetLevels: pickAll(ACADEMIC_LEVELS, fd.getAll("targetLevels")) as AcademicLevel[],
      preparationPlan: str(fd, "preparationPlan", 4000, true),
      resources: str(fd, "resources", 4000, true),
      startDate: date(String(fd.get("startDate") ?? "")),
      endDate: date(String(fd.get("endDate") ?? "")),
      notes: str(fd, "notes", 4000, true),
      outcomes: str(fd, "outcomes", 4000, true),
    },
  });
  await audit(admin.id, "initiative_updated", id);
  revalidatePath(`/admin/scientific-planning/${id}`);
}

/** Status changes are always recorded in the initiative's history. */
export async function changeInitiativeStatus(id: string, fd: FormData) {
  const admin = await requireAdmin();
  const status = pick(INITIATIVE_STATUSES, fd.get("status")) as InitiativeStatus | null;
  if (!status || !isId(id)) return;
  const current = await prisma.initiative.findUniqueOrThrow({ where: { id }, select: { status: true } });
  if (current.status === status) return;
  await prisma.initiative.update({
    where: { id },
    data: { status, statusChanges: { create: { fromStatus: current.status, toStatus: status, note: str(fd, "note", 500, true), changedById: admin.id } } },
  });
  await audit(admin.id, "initiative_status", `${id}: ${current.status} → ${status}`);
  revalidatePath(`/admin/scientific-planning/${id}`);
}

export async function addInitiativeStaff(id: string, profileId: string) {
  const admin = await requireAdmin();
  if (!isId(id) || !isId(profileId)) return;
  await prisma.initiativeStaff.upsert({ where: { initiativeId_profileId: { initiativeId: id, profileId } }, create: { initiativeId: id, profileId }, update: {} });
  await audit(admin.id, "initiative_staff_added", `${id} ${profileId}`);
  revalidatePath(`/admin/scientific-planning/${id}`);
}

export async function updateInitiativeStaff(id: string, profileId: string, fd: FormData) {
  const admin = await requireAdmin();
  if (!isId(id) || !isId(profileId)) return;
  if (fd.get("remove")) {
    await prisma.initiativeStaff.delete({ where: { initiativeId_profileId: { initiativeId: id, profileId } } });
  } else {
    await prisma.initiativeStaff.update({
      where: { initiativeId_profileId: { initiativeId: id, profileId } },
      data: { role: str(fd, "role", 120), confirmed: fd.get("confirmed") === "on" },
    });
  }
  await audit(admin.id, "initiative_staff_updated", `${id} ${profileId}`);
  revalidatePath(`/admin/scientific-planning/${id}`);
}

export async function addInitiativeStudent(id: string, submissionId: string) {
  const admin = await requireAdmin();
  if (!isId(id) || !isId(submissionId)) return;
  await prisma.initiativeStudent.upsert({
    where: { initiativeId_submissionId: { initiativeId: id, submissionId } },
    create: { initiativeId: id, submissionId },
    update: {},
  });
  await audit(admin.id, "initiative_student_added", `${id} ${submissionId}`);
  revalidatePath(`/admin/scientific-planning/${id}`);
}

export async function updateInitiativeStudent(id: string, submissionId: string, fd: FormData) {
  const admin = await requireAdmin();
  if (!isId(id) || !isId(submissionId)) return;
  if (fd.get("remove")) {
    await prisma.initiativeStudent.delete({ where: { initiativeId_submissionId: { initiativeId: id, submissionId } } });
  } else {
    const status = pick(STUDENT_ASSIGNMENT_STATUSES, fd.get("status")) as StudentAssignmentStatus | null;
    if (status) await prisma.initiativeStudent.update({ where: { initiativeId_submissionId: { initiativeId: id, submissionId } }, data: { status } });
  }
  await audit(admin.id, "initiative_student_updated", `${id} ${submissionId}`);
  revalidatePath(`/admin/scientific-planning/${id}`);
}

export async function addMilestone(id: string, fd: FormData) {
  const admin = await requireAdmin();
  const title = str(fd, "title", 200);
  if (!isId(id) || !title) return;
  await prisma.initiativeMilestone.create({ data: { initiativeId: id, title, dueDate: date(String(fd.get("dueDate") ?? "")) } });
  await audit(admin.id, "milestone_added", id);
  revalidatePath(`/admin/scientific-planning/${id}`);
}

export async function updateMilestone(id: string, milestoneId: string, fd: FormData) {
  const admin = await requireAdmin();
  if (!isId(id) || !isId(milestoneId)) return;
  const action = fd.get("action");
  if (action === "delete") await prisma.initiativeMilestone.delete({ where: { id: milestoneId } });
  else await prisma.initiativeMilestone.update({ where: { id: milestoneId }, data: { completedAt: action === "complete" ? new Date() : null } });
  await audit(admin.id, "milestone_updated", `${id} ${milestoneId} ${action}`);
  revalidatePath(`/admin/scientific-planning/${id}`);
}
