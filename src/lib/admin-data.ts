import "server-only";
import type { Prisma } from "@prisma/client";
import {
  ACADEMIC_LEVELS,
  EXPERIENCE_TYPES,
  READINESS,
  SPECIALISATIONS,
  TEAM_ROLES,
  TECHNICAL_FIELDS,
  WEEKLY_HOURS,
} from "@/config/survey";
import type { IseTrack } from "@/config/survey";
import { prisma } from "./db";

export interface Filters {
  q?: string;
  level?: (typeof ACADEMIC_LEVELS)[number];
  spec?: string;
  field?: (typeof TECHNICAL_FIELDS)[number];
  minProf?: number;
  exp?: (typeof EXPERIENCE_TYPES)[number];
  readiness?: (typeof READINESS)[number];
  hours?: (typeof WEEKLY_HOURS)[number];
  role?: (typeof TEAM_ROLES)[number];
}

const pick = <T extends readonly string[]>(list: T, v: string | null | undefined) =>
  v && (list as readonly string[]).includes(v) ? (v as T[number]) : undefined;

/** Parses untrusted query parameters into a whitelisted filter object. */
export function parseFilters(sp: URLSearchParams): Filters {
  const minProf = Number(sp.get("minProf"));
  return {
    q: sp.get("q")?.trim().slice(0, 100) || undefined,
    level: pick(ACADEMIC_LEVELS, sp.get("level")),
    spec: SPECIALISATIONS.some((s) => s.value === sp.get("spec")) ? sp.get("spec")! : undefined,
    field: pick(TECHNICAL_FIELDS, sp.get("field")),
    minProf: minProf >= 1 && minProf <= 5 ? Math.floor(minProf) : undefined,
    exp: pick(EXPERIENCE_TYPES, sp.get("exp")),
    readiness: pick(READINESS, sp.get("readiness")),
    hours: pick(WEEKLY_HOURS, sp.get("hours")),
    role: pick(TEAM_ROLES, sp.get("role")),
  };
}

export function filtersToQuery(f: Filters): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== "") p.set(k, String(v));
  return p.toString();
}

export function buildWhere(f: Filters): Prisma.SubmissionWhereInput {
  const and: Prisma.SubmissionWhereInput[] = [];
  if (f.q) {
    and.push({
      OR: [
        { fullName: { contains: f.q, mode: "insensitive" } },
        { studentId: { contains: f.q.toUpperCase() } },
        { referenceNo: { contains: f.q.toUpperCase() } },
        { skillsAndTools: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  if (f.level) and.push({ academicLevel: f.level });
  if (f.spec) and.push({ specialisation: f.spec });
  if (f.readiness) and.push({ readiness: f.readiness });
  if (f.hours) and.push({ weeklyHours: f.hours });
  if (f.role) and.push({ teamRole: f.role });
  if (f.exp) and.push({ experiences: { some: { experience: f.exp } } });
  // Technical interest and (self-reported) minimum proficiency apply to the same field when both are set.
  if (f.field || f.minProf) {
    and.push({
      fields: {
        some: {
          ...(f.field ? { field: f.field } : {}),
          ...(f.minProf ? { proficiency: { gte: f.minProf } } : {}),
        },
      },
    });
  }
  return and.length ? { AND: and } : {};
}

export const submissionInclude = {
  interests: true,
  fields: true,
  experiences: true,
  barriers: true,
  supports: true,
} satisfies Prisma.SubmissionInclude;

export type FullSubmission = Prisma.SubmissionGetPayload<{ include: typeof submissionInclude }>;

export async function getAnalytics() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [recent, week, byTrack, total, byLevel, bySpec, byReadiness, byHours, byRole, interests, fields, experiences, barriers, supports, latest] =
    await Promise.all([
      prisma.submission.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, fullName: true, studentId: true, academicLevel: true, specialisation: true, iseTrack: true, iseTrackOther: true, readiness: true, createdAt: true },
      }),
      prisma.submission.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.submission.groupBy({ by: ["iseTrack"], where: { iseTrack: { not: null } }, _count: { _all: true } }),
      prisma.submission.count(),
      prisma.submission.groupBy({ by: ["academicLevel"], _count: { _all: true } }),
      prisma.submission.groupBy({ by: ["specialisation"], _count: { _all: true } }),
      prisma.submission.groupBy({ by: ["readiness"], _count: { _all: true } }),
      prisma.submission.groupBy({ by: ["weeklyHours"], _count: { _all: true } }),
      prisma.submission.groupBy({ by: ["teamRole"], _count: { _all: true } }),
      prisma.submissionInterest.groupBy({ by: ["activity"], _count: { _all: true } }),
      prisma.submissionField.groupBy({ by: ["field", "proficiency"], _count: { _all: true } }),
      prisma.submissionExperience.groupBy({ by: ["experience"], _count: { _all: true } }),
      prisma.submissionBarrier.groupBy({ by: ["barrier"], _count: { _all: true } }),
      prisma.submissionSupport.groupBy({ by: ["support"], _count: { _all: true } }),
      prisma.submission.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    ]);

  const toMap = <K extends string>(rows: ({ _count: { _all: number } } & Record<string, unknown>)[], key: string) =>
    Object.fromEntries(rows.map((r) => [r[key] as K, r._count._all])) as Partial<Record<K, number>>;

  const skill = TECHNICAL_FIELDS.map((f) => {
    const dist = [1, 2, 3, 4, 5].map((lvl) => fields.find((r) => r.field === f && r.proficiency === lvl)?._count._all ?? 0);
    const n = dist.reduce((a, b) => a + b, 0);
    const avg = n ? dist.reduce((a, c, i) => a + c * (i + 1), 0) / n : 0;
    return { field: f, n, dist, avg };
  })
    .filter((s) => s.n > 0)
    .sort((a, b) => b.n - a.n);

  return {
    total,
    week,
    recent,
    latestAt: latest?.createdAt ?? null,
    level: toMap(byLevel, "academicLevel"),
    spec: toMap(bySpec, "specialisation"),
    iseTrack: toMap<IseTrack>(byTrack, "iseTrack"),
    readiness: toMap(byReadiness, "readiness"),
    hours: toMap(byHours, "weeklyHours"),
    role: toMap(byRole, "teamRole"),
    interests: toMap(interests, "activity"),
    experiences: toMap(experiences, "experience"),
    barriers: toMap(barriers, "barrier"),
    supports: toMap(supports, "support"),
    skill,
  };
}
