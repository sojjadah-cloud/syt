import "server-only";
import type { AcademicLevel, ExpertiseArea, TechnicalField } from "@prisma/client";
import { FIELD_TO_EXPERTISE } from "@/config/staff";
import { prisma } from "./db";

/**
 * Transparent, rule-based matching between scientific opportunities, students and staff.
 * Uses only survey answers relevant to scientific engagement (no sensitive personal data).
 * Results are suggestions for staff review — nobody is assigned automatically.
 *
 * Student score (0–100):
 *   interest overlap with required fields  40 × (matched / required)
 *   self-rated proficiency in those fields 30 × (average − 1) / 4
 *   readiness                              Very ready 15 · Schedule-dependent 11 · Needs training 7 · Unsure 3 · Not ready 0
 *   weekly availability                    >7 h 10 · 5–7 h 8 · 2–4 h 5 · <2 h 2
 *   previous participation                 5 if any
 * Students must share at least one required field and match the target levels (if any).
 */

const READINESS_POINTS = { VERY_READY: 15, SCHEDULE_DEPENDENT: 11, NEEDS_TRAINING: 7, UNSURE: 3, NOT_READY: 0 } as const;
const HOURS_POINTS = { GT_7: 10, H5_7: 8, H2_4: 5, LT_2: 2 } as const;

export type StudentMatch = {
  submissionId: string;
  fullName: string;
  studentId: string;
  level: AcademicLevel;
  specialisation: string;
  score: number;
  matched: { field: TechnicalField; proficiency: number }[];
  readiness: keyof typeof READINESS_POINTS;
  hours: keyof typeof HOURS_POINTS;
  experiences: string[];
};

export async function matchStudents(required: TechnicalField[], levels: AcademicLevel[] = [], limit = 30): Promise<StudentMatch[]> {
  if (required.length === 0) return [];
  const students = await prisma.submission.findMany({
    where: {
      fields: { some: { field: { in: required } } },
      ...(levels.length ? { academicLevel: { in: levels } } : {}),
    },
    select: {
      id: true,
      fullName: true,
      studentId: true,
      academicLevel: true,
      specialisation: true,
      readiness: true,
      weeklyHours: true,
      fields: { select: { field: true, proficiency: true } },
      experiences: { select: { experience: true } },
    },
  });

  return students
    .map((s) => {
      const matched = s.fields.filter((f) => required.includes(f.field));
      const avg = matched.reduce((a, f) => a + f.proficiency, 0) / matched.length;
      const experiences = s.experiences.map((e) => e.experience).filter((e) => e !== "NONE");
      const score =
        40 * (matched.length / required.length) +
        30 * ((avg - 1) / 4) +
        READINESS_POINTS[s.readiness] +
        HOURS_POINTS[s.weeklyHours] +
        (experiences.length ? 5 : 0);
      return {
        submissionId: s.id,
        fullName: s.fullName,
        studentId: s.studentId,
        level: s.academicLevel,
        specialisation: s.specialisation,
        score: Math.round(score),
        matched,
        readiness: s.readiness,
        hours: s.weeklyHours,
        experiences,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export type StaffMatch = {
  profileId: string;
  fullName: string;
  position: string;
  score: number;
  expertise: ExpertiseArea[];
  mentor: string | null;
  superviseExternal: string | null;
  workshops: string[];
  projects: string[];
};

/** Staff whose submitted contribution survey relates to the required fields. */
export async function matchStaff(required: TechnicalField[], limit = 15): Promise<StaffMatch[]> {
  const areas = [...new Set(required.flatMap((f) => FIELD_TO_EXPERTISE[f]))];
  if (areas.length === 0) return [];
  const surveys = await prisma.contributionSurvey.findMany({
    where: {
      status: "SUBMITTED",
      OR: [
        { expertise: { hasSome: areas } },
        { mentorFields: { hasSome: areas } },
        { workshops: { some: { field: { in: areas } } } },
        { projects: { some: { field: { in: areas } } } },
      ],
    },
    select: {
      expertise: true,
      mentorCompetitions: true,
      mentorFields: true,
      superviseExternal: true,
      profile: { select: { id: true, fullName: true, position: true } },
      workshops: { where: { field: { in: areas } }, select: { title: true } },
      projects: { where: { field: { in: areas } }, select: { title: true } },
    },
  });

  // One row per staff member (latest survey wins if several exist).
  const byProfile = new Map<string, StaffMatch>();
  for (const s of surveys) {
    const overlap = s.expertise.filter((e) => areas.includes(e));
    const mentorOverlap = s.mentorFields.some((e) => areas.includes(e));
    const score =
      overlap.length * 2 +
      (s.mentorCompetitions === "YES" ? 3 : s.mentorCompetitions === "DEPENDS" ? 1 : 0) +
      (mentorOverlap ? 2 : 0) +
      (s.superviseExternal === "YES" ? 2 : s.superviseExternal?.startsWith("DEPENDS") ? 1 : 0) +
      s.workshops.length +
      s.projects.length;
    const prev = byProfile.get(s.profile.id);
    if (!prev || prev.score < score) {
      byProfile.set(s.profile.id, {
        profileId: s.profile.id,
        fullName: s.profile.fullName,
        position: s.profile.position,
        score,
        expertise: overlap,
        mentor: s.mentorCompetitions,
        superviseExternal: s.superviseExternal,
        workshops: s.workshops.map((w) => w.title),
        projects: s.projects.map((p) => p.title),
      });
    }
  }
  return [...byProfile.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

export type TrainingNeed = { field: TechnicalField; weak: number; total: number; workshops: string[] };

/** Fields where suggested students self-rate below Intermediate, plus related proposed workshops. */
export async function trainingNeeds(required: TechnicalField[], students: StudentMatch[]): Promise<TrainingNeed[]> {
  const needs: TrainingNeed[] = [];
  for (const field of required) {
    const withField = students.filter((s) => s.matched.some((m) => m.field === field));
    const weak = withField.filter((s) => (s.matched.find((m) => m.field === field)?.proficiency ?? 0) < 3).length;
    const areas = FIELD_TO_EXPERTISE[field];
    const workshops = areas.length
      ? await prisma.proposedWorkshop.findMany({
          where: { field: { in: areas }, survey: { status: "SUBMITTED" }, reviewStatus: { not: "DECLINED" } },
          select: { title: true },
          take: 5,
        })
      : [];
    needs.push({ field, weak, total: withField.length, workshops: workshops.map((w) => w.title) });
  }
  return needs;
}

export async function matchAll(required: TechnicalField[], levels: AcademicLevel[] = []) {
  const students = await matchStudents(required, levels);
  const [staff, training] = await Promise.all([matchStaff(required), trainingNeeds(required, students)]);
  return { students, staff, training };
}
