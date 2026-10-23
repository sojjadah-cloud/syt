import { z } from "zod";
import {
  ACADEMIC_LEVELS,
  BARRIERS,
  EXCLUSIVE_OPTION,
  EXPERIENCE_TYPES,
  INTEREST_ACTIVITIES,
  ISE_SPECIALISATION,
  ISE_TRACKS,
  LIMITS,
  MAX_FIELDS,
  MAX_SUPPORT,
  READINESS,
  SPECIALISATIONS,
  STUDENT_ID_PATTERN,
  SUPPORT_TYPES,
  TEAM_ROLES,
  TECHNICAL_FIELDS,
  WEEKLY_HOURS,
  type AcademicLevel,
  type Barrier,
  type ExperienceType,
  type InterestActivity,
  type IseTrack,
  type Readiness,
  type SupportType,
  type TeamRole,
  type TechnicalField,
  type WeeklyHours,
} from "@/config/survey";
import { sanitizeText } from "./sanitize";

/**
 * Validation messages are keys of `errors` in src/i18n so they re-translate
 * instantly when the student switches language.
 */
export type ErrorKey = keyof typeof import("@/i18n/en").default.errors;
const msg = (key: ErrorKey) => key;

export interface SurveyValues {
  fullName: string;
  studentId: string;
  academicLevel: AcademicLevel | "";
  specialisation: string;
  iseTrack: IseTrack | "";
  iseTrackOther: string;
  interests: InterestActivity[];
  fields: TechnicalField[];
  otherField: string;
  proficiency: Partial<Record<TechnicalField, number>>;
  experience: ExperienceType[];
  skills: string;
  achievements: string;
  readiness: Readiness | "";
  weeklyHours: WeeklyHours | "";
  teamRole: TeamRole | "";
  barriers: Barrier[];
  support: SupportType[];
}

export const EMPTY_VALUES: SurveyValues = {
  fullName: "",
  studentId: "",
  academicLevel: "",
  specialisation: "",
  iseTrack: "",
  iseTrackOther: "",
  interests: [],
  fields: [],
  otherField: "",
  proficiency: {},
  experience: [],
  skills: "",
  achievements: "",
  readiness: "",
  weeklyHours: "",
  teamRole: "",
  barriers: [],
  support: [],
};

const NAME_RE = /^[A-Za-z][A-Za-z.'\- ]*[A-Za-z.]$/;

const line = (max: number) =>
  z.string({ error: msg("required") }).transform((s) => sanitizeText(s)).pipe(
    z.string().min(1, msg("required")).max(max, msg("tooLong")),
  );

const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .transform((s) => sanitizeText(s ?? "", true))
    .pipe(z.string().max(max, msg("tooLong")));

const unique = <T extends string>(arr: T[]) => Array.from(new Set(arr));

const multi = <T extends readonly [string, ...string[]]>(options: T) =>
  z
    .array(z.enum(options), { error: msg("selectAtLeastOne") })
    .transform(unique)
    .pipe(z.array(z.enum(options)).min(1, msg("selectAtLeastOne")));

const single = <T extends readonly [string, ...string[]]>(options: T) =>
  z.enum(options, { error: msg("selectOne") });

// ---------------------------------------------------------------------------
// Section shapes and cross-field rules
// ---------------------------------------------------------------------------

const section1 = {
  fullName: line(LIMITS.fullName).pipe(
    z
      .string()
      .regex(NAME_RE, msg("nameInvalid"))
      .refine((s) => s.split(" ").filter(Boolean).length >= 2, msg("nameInvalid")),
  ),
  studentId: z
    .string({ error: msg("required") })
    .transform((s) => sanitizeText(s).replace(/\s+/g, "").toUpperCase())
    .pipe(
      z
        .string()
        .min(1, msg("required"))
        .max(LIMITS.studentId, msg("tooLong"))
        .regex(STUDENT_ID_PATTERN, msg("studentIdInvalid")),
    ),
  academicLevel: single(ACADEMIC_LEVELS),
  specialisation: z
    .string({ error: msg("specialisationInvalid") })
    .refine((v) => SPECIALISATIONS.some((s) => s.value === v), msg("specialisationInvalid")),
  iseTrack: z.union([z.enum(ISE_TRACKS), z.literal("")]).optional().default(""),
  iseTrackOther: optionalText(LIMITS.otherField).transform((s) => s.replace(/\s+/g, " ")),
};

type Ctx = z.RefinementCtx;

function refineSection1(v: { specialisation: string; iseTrack: string; iseTrackOther: string }, ctx: Ctx) {
  if (v.specialisation !== ISE_SPECIALISATION) return;
  if (!v.iseTrack) ctx.addIssue({ code: "custom", path: ["iseTrack"], message: msg("selectOne") });
  else if (v.iseTrack === "OTHER" && !v.iseTrackOther) {
    ctx.addIssue({ code: "custom", path: ["iseTrackOther"], message: msg("otherTrackRequired") });
  }
}

const section2 = {
  interests: multi(INTEREST_ACTIVITIES),
  fields: multi(TECHNICAL_FIELDS).pipe(z.array(z.enum(TECHNICAL_FIELDS)).max(MAX_FIELDS, msg("maxThree"))),
  otherField: optionalText(LIMITS.otherField).transform((s) => s.replace(/\s+/g, " ")),
  proficiency: z.record(z.string(), z.number().int().min(1).max(5).optional()).optional().default({}),
};

function refineSection2(v: { fields: TechnicalField[]; otherField: string; proficiency: Record<string, number | undefined> }, ctx: Ctx) {
  if (v.fields.includes("OTHER") && !v.otherField) {
    ctx.addIssue({ code: "custom", path: ["otherField"], message: msg("otherRequired") });
  }
  for (const f of v.fields) {
    const p = v.proficiency[f];
    if (typeof p !== "number" || p < 1 || p > 5) {
      ctx.addIssue({ code: "custom", path: ["proficiency", f], message: msg("proficiencyRequired") });
    }
  }
}

const exclusive = (path: string) => (v: Record<string, unknown>, ctx: Ctx) => {
  const arr = v[path] as string[];
  if (arr.includes(EXCLUSIVE_OPTION) && arr.length > 1) {
    ctx.addIssue({ code: "custom", path: [path], message: msg("exclusive") });
  }
};

const section3 = {
  experience: multi(EXPERIENCE_TYPES),
  skills: line(LIMITS.skillsAndTools),
  achievements: optionalText(LIMITS.achievements),
};

const section4 = {
  readiness: single(READINESS),
  weeklyHours: single(WEEKLY_HOURS),
  teamRole: single(TEAM_ROLES),
};

const section5 = {
  barriers: multi(BARRIERS),
  support: multi(SUPPORT_TYPES).pipe(z.array(z.enum(SUPPORT_TYPES)).max(MAX_SUPPORT, msg("maxThree"))),
};

export const sectionSchemas = [
  z.object(section1).superRefine(refineSection1),
  z.object(section2).superRefine(refineSection2),
  z.object(section3).superRefine(exclusive("experience")),
  z.object(section4),
  z.object(section5).superRefine(exclusive("barriers")),
] as const;

export const SECTION_FIELDS: (keyof SurveyValues)[][] = [
  Object.keys(section1),
  Object.keys(section2),
  Object.keys(section3),
  Object.keys(section4),
  Object.keys(section5),
] as (keyof SurveyValues)[][];

/** Complete payload accepted by POST /api/submissions. */
export const submissionSchema = z
  .object({
    ...section1,
    ...section2,
    ...section3,
    ...section4,
    ...section5,
    consent: z.literal(true, { error: msg("consentRequired") }),
    idempotencyKey: z.uuid(),
    locale: z.enum(["en", "ar"]).default("en"),
  })
  .superRefine((v, ctx) => {
    refineSection1(v, ctx);
    refineSection2(v, ctx);
    exclusive("experience")(v, ctx);
    exclusive("barriers")(v, ctx);
  })
  .transform((v) => ({
    ...v,
    iseTrack: v.specialisation === ISE_SPECIALISATION ? v.iseTrack : "",
    iseTrackOther: v.specialisation === ISE_SPECIALISATION && v.iseTrack === "OTHER" ? v.iseTrackOther : "",
    otherField: v.fields.includes("OTHER") ? v.otherField : "",
    // Keep only ratings for selected fields.
    proficiency: Object.fromEntries(v.fields.map((f) => [f, v.proficiency[f] as number])) as Record<TechnicalField, number>,
  }));

export type SubmissionInput = z.output<typeof submissionSchema>;

// ---------------------------------------------------------------------------
// Question registry — drives progress tracking and the sidebar counts.
// ---------------------------------------------------------------------------

const filled = (s: string) => s.trim().length > 0;

export const QUESTIONS: { section: number; required: boolean; answered: (v: SurveyValues) => boolean }[] = [
  { section: 0, required: true, answered: (v) => filled(v.fullName) },
  { section: 0, required: true, answered: (v) => filled(v.studentId) },
  { section: 0, required: true, answered: (v) => !!v.academicLevel },
  {
    section: 0,
    required: true,
    answered: (v) =>
      !!v.specialisation &&
      (v.specialisation !== ISE_SPECIALISATION || (!!v.iseTrack && (v.iseTrack !== "OTHER" || filled(v.iseTrackOther)))),
  },
  { section: 1, required: true, answered: (v) => v.interests.length > 0 },
  { section: 1, required: true, answered: (v) => v.fields.length > 0 && (!v.fields.includes("OTHER") || filled(v.otherField)) },
  { section: 1, required: true, answered: (v) => v.fields.length > 0 && v.fields.every((f) => !!v.proficiency[f]) },
  { section: 2, required: true, answered: (v) => v.experience.length > 0 },
  { section: 2, required: true, answered: (v) => filled(v.skills) },
  { section: 2, required: false, answered: (v) => filled(v.achievements) },
  { section: 3, required: true, answered: (v) => !!v.readiness },
  { section: 3, required: true, answered: (v) => !!v.weeklyHours },
  { section: 3, required: true, answered: (v) => !!v.teamRole },
  { section: 4, required: true, answered: (v) => v.barriers.length > 0 },
  { section: 4, required: true, answered: (v) => v.support.length > 0 },
];

export const SECTION_QUESTION_COUNTS = [0, 1, 2, 3, 4].map((s) => QUESTIONS.filter((q) => q.section === s).length);

export function completionPercent(v: SurveyValues): number {
  const required = QUESTIONS.filter((q) => q.required);
  const done = required.filter((q) => q.answered(v)).length;
  return Math.round((done / required.length) * 100);
}
