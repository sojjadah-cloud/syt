/**
 * Staff surveys — form values, validation and conversion to database records.
 * Shared by the browser (step-by-step validation) and the server (authoritative checks).
 *
 * The base schemas only normalise input (unknown option values are dropped), so they never
 * fail; every "required" rule lives in the refine functions.
 *
 * Question sets are deliberately short: overlapping questions were merged (e.g. one
 * "opportunities" question instead of two, per-activity resources instead of a separate
 * module-level question) and supporting detail can be attached as files.
 */
import { z } from "zod";
import {
  ACTIVITY_TIMINGS,
  ALL_LEVELS,
  ASSESSMENT_METHODS,
  ATTACHMENT_LIMITS,
  AVAILABILITY,
  COMPETITION_POTENTIAL,
  CONTRIBUTION_TYPES,
  DELIVERY_PREFERENCES,
  DEPARTMENT_SUPPORT,
  EXPERTISE_AREAS,
  LEVEL_OPTIONS,
  MENTOR_WILLINGNESS,
  MODULE_ACTIVITY_TYPES,
  OPPORTUNITY_TYPES,
  PARTICIPATION,
  PARTICIPATION_CHALLENGES,
  PREPARATION_METHODS,
  PRIORITIES,
  SCIENTIFIC_ACTIVITY_TYPES,
  SEMESTERS,
  STAFF_LIMITS,
  SUPPORT_AREAS,
  WORKSHOP_FORMATS,
  YES_NO_NOT,
  YES_POSSIBLY_NOT,
} from "@/config/staff";
import { ACADEMIC_LEVELS, SPECIALISATIONS, TECHNICAL_FIELDS } from "@/config/survey";
import { sanitizeText } from "./sanitize";

type Ctx = z.RefinementCtx;
type Path = (string | number)[];

// ---------------------------------------------------------------------------
// Normalising primitives
// ---------------------------------------------------------------------------

const str = (multiline = false) =>
  z.preprocess((v) => (typeof v === "string" ? v : v == null ? "" : String(v)), z.string()).transform((s) => sanitizeText(s, multiline));
const text = () => str(true);
const one = <T extends readonly string[]>(list: T) =>
  z.preprocess((v) => (typeof v === "string" && (list as readonly string[]).includes(v) ? v : ""), z.string()) as unknown as z.ZodType<
    T[number] | ""
  >;
const many = <T extends readonly string[]>(list: T) =>
  z.preprocess(
    (v) => (Array.isArray(v) ? Array.from(new Set(v.filter((x) => (list as readonly string[]).includes(x)))) : []),
    z.array(z.string()),
  ) as unknown as z.ZodType<T[number][]>;
const list = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess((v) => (Array.isArray(v) ? v.slice(0, STAFF_LIMITS.items) : []), z.array(item));

const ID_RE = /^[a-z0-9]{10,40}$/i;
const PATHWAY_CODES = SPECIALISATIONS.map((s) => s.value);

/** Files uploaded beforehand via /api/staff/upload; only their ids are submitted. */
export type AttachmentRef = { id: string; name: string; size: number };
const attachments = z.preprocess(
  (v) =>
    Array.isArray(v)
      ? v
          .filter((a): a is AttachmentRef => !!a && typeof a === "object" && typeof a.id === "string" && ID_RE.test(a.id))
          .slice(0, ATTACHMENT_LIMITS.perItem)
          .map((a) => ({ id: a.id, name: String(a.name ?? "").slice(0, 200), size: Number(a.size) || 0 }))
      : [],
  z.array(z.object({ id: z.string(), name: z.string(), size: z.number() })),
);

// ---------------------------------------------------------------------------
// Rule helpers
// ---------------------------------------------------------------------------

const add = (ctx: Ctx, path: Path, message: string) => ctx.addIssue({ code: "custom", path, message });
const need = (ctx: Ctx, v: string, path: Path, msg = "required") => !v && add(ctx, path, msg);
const needSome = (ctx: Ctx, v: unknown[], path: Path) => v.length === 0 && add(ctx, path, "selectAtLeastOne");
const needOther = (ctx: Ctx, values: string[], other: string, path: Path) =>
  values.includes("OTHER") && !other && add(ctx, path, "otherRequired");
const maxLen = (ctx: Ctx, v: string, max: number, path: Path) => v.length > max && add(ctx, path, "tooLong");
const isUrl = (v: string) => /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isCount = (v: string) => /^\d{1,4}$/.test(v);

/** Format checks (links, dates, numbers, lengths). */
const formats = (ctx: Ctx, path: Path, o: { url?: string; dates?: [string, string][]; counts?: [string, string][]; long?: [string, string][]; short?: [string, string][] }) => {
  if (o.url && !isUrl(o.url)) add(ctx, [...path, "url"], "url");
  o.dates?.forEach(([k, v]) => v && !isDate(v) && add(ctx, [...path, k], "date"));
  o.counts?.forEach(([k, v]) => v && !isCount(v) && add(ctx, [...path, k], "number"));
  o.long?.forEach(([k, v]) => maxLen(ctx, v, STAFF_LIMITS.long, [...path, k]));
  o.short?.forEach(([k, v]) => maxLen(ctx, v, STAFF_LIMITS.short, [...path, k]));
};

// ===========================================================================
// Staff details — first step of every staff form (no account needed)
// ===========================================================================

export const identitySchema = z.object({
  fullName: str(),
  email: str().transform((s) => s.toLowerCase()),
  position: str(),
  department: str(),
});
export type Identity = z.output<typeof identitySchema>;
export const emptyIdentity = (): Identity => ({ fullName: "", email: "", position: "", department: "" });

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function identityRules(v: Identity, ctx: Ctx) {
  need(ctx, v.fullName, ["identity", "fullName"]);
  if (!v.email) add(ctx, ["identity", "email"], "required");
  else if (!EMAIL_RE.test(v.email)) add(ctx, ["identity", "email"], "email");
  need(ctx, v.position, ["identity", "position"]);
  need(ctx, v.department, ["identity", "department"]);
  formats(ctx, ["identity"], { short: [["fullName", v.fullName], ["email", v.email], ["position", v.position], ["department", v.department]] });
}

// ===========================================================================
// Survey A — Pathway leaders (9 questions)
// ===========================================================================

export const opportunitySchema = z.object({
  id: z.preprocess((v) => (typeof v === "string" && ID_RE.test(v) ? v : undefined), z.string().optional()),
  name: str(),
  type: one(OPPORTUNITY_TYPES),
  organiser: str(),
  location: str(),
  url: str(),
  expectedDate: str(),
  registrationDeadline: str(),
  targetLevels: many(LEVEL_OPTIONS),
  participation: one(PARTICIPATION),
  teamSize: str(),
  requiredFields: many(TECHNICAL_FIELDS),
  requiredSkills: text(),
  eligibility: text(),
  preparation: text(),
  /** Equipment, funding or other support needed (one merged field). */
  equipment: text(),
  priority: one(PRIORITIES),
  notes: text(),
  attachments,
});
export const recommendationSchema = z.object({
  name: str(),
  description: text(),
  priority: one(PRIORITIES),
  period: str(),
});

export const pathwayBase = z.object({
  identity: identitySchema,
  pathways: z.preprocess((v) => (Array.isArray(v) ? [...new Set(v.filter((x) => PATHWAY_CODES.includes(x)))] : []), z.array(z.string())),
  competencies: text(),
  activityTypes: many(SCIENTIFIC_ACTIVITY_TYPES),
  activityTypesOther: str(),
  /** One question covers competitions, conferences and other opportunities. */
  knowsCompetitions: one(YES_NO_NOT),
  opportunities: list(opportunitySchema),
  preparationMethods: many(PREPARATION_METHODS),
  preparationMethodsOther: str(),
  challenges: many(PARTICIPATION_CHALLENGES),
  challengesOther: str(),
  supportNeeded: many(DEPARTMENT_SUPPORT),
  supportDetails: text(),
  partners: text(),
  recommendations: list(recommendationSchema),
});
export type PathwayValues = z.output<typeof pathwayBase>;
export type PathwayData = PathwayValues;

export const showOpportunities = (v: { knowsCompetitions: string }) => v.knowsCompetitions === "YES";

function pathwayFormats(v: PathwayData, ctx: Ctx) {
  v.opportunities.forEach((o, i) =>
    formats(ctx, ["opportunities", i], {
      url: o.url || undefined,
      dates: [["expectedDate", o.expectedDate], ["registrationDeadline", o.registrationDeadline]],
      counts: [["teamSize", o.teamSize]],
      short: [["name", o.name], ["organiser", o.organiser], ["location", o.location]],
      long: [["requiredSkills", o.requiredSkills], ["preparation", o.preparation], ["notes", o.notes], ["eligibility", o.eligibility], ["equipment", o.equipment]],
    }),
  );
  formats(ctx, [], { long: [["competencies", v.competencies], ["partners", v.partners], ["supportDetails", v.supportDetails]] });
}

function pathwayRules(v: PathwayData, ctx: Ctx) {
  needSome(ctx, v.pathways, ["pathways"]);
  need(ctx, v.competencies, ["competencies"]);
  needSome(ctx, v.activityTypes, ["activityTypes"]);
  needOther(ctx, v.activityTypes, v.activityTypesOther, ["activityTypesOther"]);
  need(ctx, v.knowsCompetitions, ["knowsCompetitions"], "selectOne");
  if (showOpportunities(v)) {
    if (v.opportunities.length === 0) add(ctx, ["opportunities"], "needOpportunity");
    v.opportunities.forEach((o, i) => {
      need(ctx, o.name, ["opportunities", i, "name"]);
      need(ctx, o.type, ["opportunities", i, "type"], "selectOne");
      need(ctx, o.priority, ["opportunities", i, "priority"], "selectOne");
    });
  }
  needSome(ctx, v.preparationMethods, ["preparationMethods"]);
  needOther(ctx, v.preparationMethods, v.preparationMethodsOther, ["preparationMethodsOther"]);
  needSome(ctx, v.challenges, ["challenges"]);
  needOther(ctx, v.challenges, v.challengesOther, ["challengesOther"]);
  if (v.recommendations.length === 0) add(ctx, ["recommendations"], "required");
  if (v.recommendations.length > 3) add(ctx, ["recommendations"], "maxThree");
  v.recommendations.forEach((r, i) => need(ctx, r.name, ["recommendations", i, "name"]));
}

export const pathwaySubmit = pathwayBase.superRefine((v, ctx) => {
  identityRules(v.identity, ctx);
  pathwayFormats(v, ctx);
  pathwayRules(v, ctx);
});

export const PATHWAY_STEPS: (keyof PathwayData)[][] = [
  ["identity"],
  ["pathways", "competencies", "activityTypes", "activityTypesOther"],
  ["knowsCompetitions", "opportunities"],
  ["preparationMethods", "preparationMethodsOther", "challenges", "challengesOther", "supportNeeded", "supportDetails", "partners", "recommendations"],
];

export const emptyOpportunity = (): z.output<typeof opportunitySchema> => ({
  name: "",
  type: "COMPETITION",
  organiser: "",
  location: "",
  url: "",
  expectedDate: "",
  registrationDeadline: "",
  targetLevels: [],
  participation: "",
  teamSize: "",
  requiredFields: [],
  requiredSkills: "",
  eligibility: "",
  preparation: "",
  equipment: "",
  priority: "MEDIUM",
  notes: "",
  attachments: [],
});
export const emptyRecommendation = (): z.output<typeof recommendationSchema> => ({ name: "", description: "", priority: "MEDIUM", period: "" });

export const emptyPathway = (): PathwayValues => ({
  identity: emptyIdentity(),
  pathways: [],
  competencies: "",
  activityTypes: [],
  activityTypesOther: "",
  knowsCompetitions: "",
  opportunities: [],
  preparationMethods: [],
  preparationMethodsOther: "",
  challenges: [],
  challengesOther: "",
  supportNeeded: [],
  supportDetails: "",
  partners: "",
  recommendations: [emptyRecommendation()],
});

// ===========================================================================
// Survey B — TNA module coordinators (7 questions + activities)
// ===========================================================================

export const outcomeSchema = z.object({
  key: z.preprocess((v) => (typeof v === "string" && /^[\w-]{6,64}$/.test(v) ? v : ""), z.string()),
  identifier: str(),
  description: text(),
  category: str(),
});
export const activitySchema = z.object({
  title: str(),
  type: one(MODULE_ACTIVITY_TYPES),
  /** Description including the engineering problem. */
  description: text(),
  /** Student tasks and expected deliverables. */
  studentTasks: text(),
  format: one(PARTICIPATION),
  teamSize: str(),
  duration: str(),
  resources: text(),
  outcomeKeys: z.preprocess((v) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === "string"))] : []), z.array(z.string())),
  assessmentMethods: many(ASSESSMENT_METHODS),
  assessmentOther: text(),
  timing: one(ACTIVITY_TIMINGS),
  competitionPotential: one(COMPETITION_POTENTIAL),
  competitionNote: text(),
  attachments,
});

export const moduleBase = z.object({
  identity: identitySchema,
  moduleName: str(),
  moduleCode: str().transform((s) => s.toUpperCase()),
  level: one(ACADEMIC_LEVELS),
  semester: one(SEMESTERS),
  overview: text(),
  /** e.g. module descriptor or outline. */
  attachments,
  outcomes: list(outcomeSchema),
  hasPractical: one(["YES", "NO"] as const),
  practicalDetails: text(),
  canSupportActivity: one(YES_POSSIBLY_NOT),
  activities: list(activitySchema),
});
export type ModuleValues = z.output<typeof moduleBase>;
export type ModuleData = ModuleValues;

export const showActivities = (v: { canSupportActivity: string }) => v.canSupportActivity === "YES" || v.canSupportActivity === "POSSIBLY";

function moduleFormats(v: ModuleData, ctx: Ctx) {
  formats(ctx, [], { short: [["moduleName", v.moduleName], ["moduleCode", v.moduleCode]], long: [["overview", v.overview], ["practicalDetails", v.practicalDetails]] });
  v.outcomes.forEach((o, i) => {
    if (!o.key) add(ctx, ["outcomes", i, "identifier"], "required");
    formats(ctx, ["outcomes", i], { short: [["identifier", o.identifier]], long: [["description", o.description]] });
  });
  v.activities.forEach((a, i) =>
    formats(ctx, ["activities", i], {
      counts: [["teamSize", a.teamSize]],
      short: [["title", a.title]],
      long: [["description", a.description], ["studentTasks", a.studentTasks], ["resources", a.resources]],
    }),
  );
}

function moduleRules(v: ModuleData, ctx: Ctx) {
  need(ctx, v.moduleName, ["moduleName"]);
  need(ctx, v.moduleCode, ["moduleCode"]);
  need(ctx, v.level, ["level"], "selectOne");
  need(ctx, v.semester, ["semester"], "selectOne");
  need(ctx, v.overview, ["overview"]);
  if (v.outcomes.length === 0) add(ctx, ["outcomes"], "needOutcome");
  v.outcomes.forEach((o, i) => {
    need(ctx, o.identifier, ["outcomes", i, "identifier"]);
    need(ctx, o.description, ["outcomes", i, "description"]);
  });
  need(ctx, v.hasPractical, ["hasPractical"], "selectOne");
  if (v.hasPractical === "YES") need(ctx, v.practicalDetails, ["practicalDetails"]);
  need(ctx, v.canSupportActivity, ["canSupportActivity"], "selectOne");
  if (showActivities(v)) {
    if (v.activities.length === 0) add(ctx, ["activities"], "needActivity");
    v.activities.forEach((a, i) => {
      const p = (k: string) => ["activities", i, k];
      need(ctx, a.title, p("title"));
      need(ctx, a.type, p("type"), "selectOne");
      need(ctx, a.description, p("description"));
      if (a.assessmentMethods.length === 0) add(ctx, p("assessmentMethods"), "selectAtLeastOne");
      need(ctx, a.timing, p("timing"), "selectOne");
      need(ctx, a.competitionPotential, p("competitionPotential"), "selectOne");
    });
  }
}

export const moduleSubmit = moduleBase.superRefine((v, ctx) => {
  identityRules(v.identity, ctx);
  moduleFormats(v, ctx);
  moduleRules(v, ctx);
});

export const MODULE_STEPS: (keyof ModuleData)[][] = [
  ["identity"],
  ["moduleName", "moduleCode", "level", "semester", "overview", "attachments"],
  ["outcomes", "hasPractical", "practicalDetails"],
  ["canSupportActivity", "activities"],
];

export const emptyOutcome = (key: string) => ({ key, identifier: "", description: "", category: "" });
export const emptyActivity = (): z.output<typeof activitySchema> => ({
  title: "",
  type: "ENGINEERING_PROJECT",
  description: "",
  studentTasks: "",
  format: "",
  teamSize: "",
  duration: "",
  resources: "",
  outcomeKeys: [],
  assessmentMethods: [],
  assessmentOther: "",
  timing: "",
  competitionPotential: "",
  competitionNote: "",
  attachments: [],
});
export const emptyModule = (): ModuleValues => ({
  identity: emptyIdentity(),
  moduleName: "",
  moduleCode: "",
  level: "",
  semester: "",
  overview: "",
  attachments: [],
  outcomes: [],
  hasPractical: "",
  practicalDetails: "",
  canSupportActivity: "",
  activities: [],
});

// ===========================================================================
// Survey C — Academic & technical staff contributions (10 questions)
// ===========================================================================

export const workshopSchema = z.object({
  title: str(),
  field: one(EXPERTISE_AREAS),
  /** Description, objectives and expected outcomes. */
  description: text(),
  levels: many(LEVEL_OPTIONS),
  maxParticipants: str(),
  format: one(WORKSHOP_FORMATS),
  duration: str(),
  /** Equipment and laboratory/venue. */
  equipment: text(),
  period: str(),
  attachments,
});
export const projectSchema = z.object({
  title: str(),
  field: one(EXPERTISE_AREAS),
  /** Problem statement and brief description. */
  problem: text(),
  /** Expected outcomes, including competition or publication opportunities. */
  expectedOutcomes: text(),
  requiredFields: many(TECHNICAL_FIELDS),
  levels: many(LEVEL_OPTIONS),
  studentCount: str(),
  duration: str(),
  resources: text(),
  contributionType: one(CONTRIBUTION_TYPES),
  attachments,
});

export const contributionBase = z.object({
  identity: identitySchema,
  expertise: many(EXPERTISE_AREAS),
  expertiseOther: str(),
  supportAreas: many(SUPPORT_AREAS),
  supportAreasOther: str(),
  workshopIntent: one(YES_POSSIBLY_NOT),
  workshops: list(workshopSchema),
  projectIntent: one(YES_POSSIBLY_NOT),
  projects: list(projectSchema),
  /** Covers competition mentoring and supervising teams in external events. */
  mentorCompetitions: one(MENTOR_WILLINGNESS),
  mentorFields: many(EXPERTISE_AREAS),
  deliveryPreferences: many(DELIVERY_PREFERENCES),
  levels: many(LEVEL_OPTIONS),
  availability: many(AVAILABILITY),
  availabilityNote: str(),
  resourcesNeeded: text(),
  recommendations: text(),
});
export type ContributionValues = z.output<typeof contributionBase>;
export type ContributionData = ContributionValues;

export const showWorkshops = (v: { workshopIntent: string }) => v.workshopIntent === "YES" || v.workshopIntent === "POSSIBLY";
export const showProjects = (v: { projectIntent: string }) => v.projectIntent === "YES" || v.projectIntent === "POSSIBLY";
export const showMentorFields = (v: { mentorCompetitions: string }) => v.mentorCompetitions === "YES" || v.mentorCompetitions === "DEPENDS";

function contributionFormats(v: ContributionData, ctx: Ctx) {
  v.workshops.forEach((w, i) =>
    formats(ctx, ["workshops", i], { counts: [["maxParticipants", w.maxParticipants]], short: [["title", w.title]], long: [["description", w.description], ["equipment", w.equipment]] }),
  );
  v.projects.forEach((p, i) =>
    formats(ctx, ["projects", i], {
      counts: [["studentCount", p.studentCount]],
      short: [["title", p.title]],
      long: [["problem", p.problem], ["expectedOutcomes", p.expectedOutcomes], ["resources", p.resources]],
    }),
  );
  formats(ctx, [], { long: [["resourcesNeeded", v.resourcesNeeded], ["recommendations", v.recommendations]] });
}

function contributionRules(v: ContributionData, ctx: Ctx) {
  needSome(ctx, v.expertise, ["expertise"]);
  needOther(ctx, v.expertise, v.expertiseOther, ["expertiseOther"]);
  needSome(ctx, v.supportAreas, ["supportAreas"]);
  needOther(ctx, v.supportAreas, v.supportAreasOther, ["supportAreasOther"]);
  need(ctx, v.workshopIntent, ["workshopIntent"], "selectOne");
  if (v.workshopIntent === "YES" && v.workshops.length === 0) add(ctx, ["workshops"], "needWorkshop");
  if (showWorkshops(v))
    v.workshops.forEach((w, i) => {
      need(ctx, w.title, ["workshops", i, "title"]);
      need(ctx, w.field, ["workshops", i, "field"], "selectOne");
      need(ctx, w.description, ["workshops", i, "description"]);
    });
  need(ctx, v.projectIntent, ["projectIntent"], "selectOne");
  if (v.projectIntent === "YES" && v.projects.length === 0) add(ctx, ["projects"], "needProject");
  if (showProjects(v))
    v.projects.forEach((p, i) => {
      need(ctx, p.title, ["projects", i, "title"]);
      need(ctx, p.field, ["projects", i, "field"], "selectOne");
      need(ctx, p.problem, ["projects", i, "problem"]);
    });
  need(ctx, v.mentorCompetitions, ["mentorCompetitions"], "selectOne");
  if (v.mentorCompetitions === "YES") needSome(ctx, v.mentorFields, ["mentorFields"]);
  needSome(ctx, v.deliveryPreferences, ["deliveryPreferences"]);
  needSome(ctx, v.levels, ["levels"]);
  needSome(ctx, v.availability, ["availability"]);
}

export const contributionSubmit = contributionBase.superRefine((v, ctx) => {
  identityRules(v.identity, ctx);
  contributionFormats(v, ctx);
  contributionRules(v, ctx);
});

export const CONTRIBUTION_STEPS: (keyof ContributionData)[][] = [
  ["identity"],
  ["expertise", "expertiseOther", "supportAreas", "supportAreasOther"],
  ["workshopIntent", "workshops", "projectIntent", "projects", "mentorCompetitions", "mentorFields"],
  ["deliveryPreferences", "levels", "availability", "availabilityNote", "resourcesNeeded", "recommendations"],
];

export const emptyWorkshop = (): z.output<typeof workshopSchema> => ({
  title: "",
  field: "",
  description: "",
  levels: [],
  maxParticipants: "",
  format: "",
  duration: "",
  equipment: "",
  period: "",
  attachments: [],
});
export const emptyProject = (): z.output<typeof projectSchema> => ({
  title: "",
  field: "",
  problem: "",
  expectedOutcomes: "",
  requiredFields: [],
  levels: [],
  studentCount: "",
  duration: "",
  resources: "",
  contributionType: "",
  attachments: [],
});
export const emptyContribution = (): ContributionValues => ({
  identity: emptyIdentity(),
  expertise: [],
  expertiseOther: "",
  supportAreas: [],
  supportAreasOther: "",
  workshopIntent: "",
  workshops: [],
  projectIntent: "",
  projects: [],
  mentorCompetitions: "",
  mentorFields: [],
  deliveryPreferences: [],
  levels: [],
  availability: [],
  availabilityNote: "",
  resourcesNeeded: "",
  recommendations: "",
});

// ===========================================================================
// Shared conversions
// ===========================================================================

/** "ALL" in the form means all four levels in the database, and back. */
export const levelsToDb = (v: string[]) =>
  (v.includes(ALL_LEVELS) ? [...ACADEMIC_LEVELS] : v.filter((x) => x !== ALL_LEVELS)) as (typeof ACADEMIC_LEVELS)[number][];
export const levelsToForm = (v: string[]) => (ACADEMIC_LEVELS.every((l) => v.includes(l)) ? [ALL_LEVELS] : v);
export const dateToDb = (v: string) => (v && isDate(v) ? new Date(`${v}T00:00:00Z`) : null);
export const dateToForm = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
export const countToDb = (v: string) => (v && isCount(v) ? Number(v) : null);
export const orNull = <T extends string>(v: T | "") => (v === "" ? null : v);

/** Issues whose top-level field belongs to the given step. */
export function issuesForStep(issues: { path: PropertyKey[]; message: string }[], fields: string[]) {
  return issues.filter((i) => fields.includes(String(i.path[0])));
}
