/**
 * Survey configuration.
 *
 * Option keys MUST match the enums in prisma/schema.prisma.
 * Display text for every option lives in src/i18n/{en,ar}.ts.
 */

// ---------------------------------------------------------------------------
// Institutional rules — review and adjust before deployment.
// ---------------------------------------------------------------------------

/**
 * Student ID validation rule. Override at build time with
 * NEXT_PUBLIC_STUDENT_ID_PATTERN (a JavaScript regular expression source).
 * IDs are trimmed and upper-cased before validation and storage.
 */
export const STUDENT_ID_PATTERN = new RegExp(
  process.env.NEXT_PUBLIC_STUDENT_ID_PATTERN || "^[A-Z0-9]{6,12}$",
);

/**
 * Officially approved Systems Engineering Department specialisations.
 * `value` is stored in the database, so keep it stable once responses are being collected.
 */
export const SPECIALISATIONS: { value: string; en: string; ar: string }[] = [
  { value: "FOUNDATION", en: "Systems Engineering Foundation Year", ar: "السنة التأسيسية لهندسة النظم" },
  { value: "COMMUNICATION", en: "Communication Systems Engineering", ar: "هندسة أنظمة الاتصالات" },
  { value: "COMPUTER", en: "Computer Systems Engineering", ar: "هندسة أنظمة الحاسوب" },
  { value: "ELECTRICAL_ELECTRONIC", en: "Electrical and Electronic System Engineering", ar: "هندسة الأنظمة الكهربائية والإلكترونية" },
  { value: "GROUND_COMMS_RADAR", en: "Ground Communications and Radar System Engineering", ar: "هندسة أنظمة الاتصالات الأرضية والرادار" },
  { value: "HVACR", en: "HVACR System Engineering", ar: "هندسة أنظمة التدفئة والتهوية والتكييف والتبريد (HVACR)" },
  { value: "MECHATRONICS", en: "Mechatronic Systems Engineering", ar: "هندسة أنظمة الميكاترونكس" },
  { value: "ORDNANCE", en: "Ordnance", ar: "الأسلحة والذخائر (Ordnance)" },
  { value: "POWER", en: "Power System Engineering", ar: "هندسة أنظمة القوى الكهربائية" },
  { value: "VEHICLE", en: "Vehicle System Engineering", ar: "هندسة أنظمة المركبات" },
  { value: "ISE", en: "Information Systems Engineering (ISE)", ar: "هندسة نظم المعلومات (ISE)" },
];

/** Specialisation that requires a track sub-selection (Q4 follow-up). */
export const ISE_SPECIALISATION = "ISE";
export const ISE_TRACKS = ["CYBERSECURITY", "AI", "IT", "OTHER"] as const;

// ---------------------------------------------------------------------------
// Fixed answer options (from the approved questionnaire).
// ---------------------------------------------------------------------------

export const ACADEMIC_LEVELS = ["LEVEL_3", "LEVEL_4", "LEVEL_5", "LEVEL_6"] as const;

export const INTEREST_ACTIVITIES = [
  "COMPETITIONS",
  "INNOVATION_PROJECTS",
  "RESEARCH",
  "HACKATHONS",
  "CONFERENCES",
  "WORKSHOPS",
] as const;

export const TECHNICAL_FIELDS = [
  "AI_ML",
  "CYBERSECURITY",
  "SOFTWARE",
  "ROBOTICS",
  "EMBEDDED_IOT",
  "NETWORKING",
  "ELECTRONICS",
  "DATA_SCIENCE",
  "SPACE",
  "DESIGN_3D",
  "OTHER",
] as const;

export const PROFICIENCY_LEVELS = [1, 2, 3, 4, 5] as const;

export const EXPERIENCE_TYPES = [
  "COMPETITIONS",
  "EXTRA_PROJECTS",
  "RESEARCH",
  "HACKATHONS",
  "EXHIBITIONS",
  "NONE",
] as const;

export const READINESS = [
  "VERY_READY",
  "SCHEDULE_DEPENDENT",
  "NEEDS_TRAINING",
  "UNSURE",
  "NOT_READY",
] as const;

export const WEEKLY_HOURS = ["LT_2", "H2_4", "H5_7", "GT_7"] as const;

export const TEAM_ROLES = [
  "PROGRAMMING",
  "DESIGN_PROTOTYPING",
  "RESEARCH_ANALYSIS",
  "PLANNING_MANAGEMENT",
  "LEADERSHIP",
  "REPORTS_PRESENTATIONS",
  "FLEXIBLE",
] as const;

export const BARRIERS = [
  "WORKLOAD",
  "LIMITED_SKILLS",
  "LACK_GUIDANCE",
  "FINDING_TEAM",
  "AWARENESS",
  "RESOURCES",
  "NONE",
] as const;

export const SUPPORT_TYPES = [
  "WORKSHOPS",
  "MENTORSHIP",
  "LABS_EQUIPMENT",
  "COMPETITION_ANNOUNCEMENTS",
  "TEAM_FORMING",
  "RESEARCH_SUPPORT",
  "EXTERNAL_EVENTS",
] as const;

/** Options that cannot be combined with any other option in the same question. */
export const EXCLUSIVE_OPTION = "NONE" as const;

export const MAX_FIELDS = 3;
export const MAX_SUPPORT = 3;

export const LIMITS = {
  fullName: 120,
  studentId: 32,
  otherField: 80,
  skillsAndTools: 600,
  achievements: 2000,
} as const;

export type IseTrack = (typeof ISE_TRACKS)[number];
export type AcademicLevel =(typeof ACADEMIC_LEVELS)[number];
export type InterestActivity = (typeof INTEREST_ACTIVITIES)[number];
export type TechnicalField = (typeof TECHNICAL_FIELDS)[number];
export type ExperienceType = (typeof EXPERIENCE_TYPES)[number];
export type Readiness = (typeof READINESS)[number];
export type WeeklyHours = (typeof WEEKLY_HOURS)[number];
export type TeamRole = (typeof TEAM_ROLES)[number];
export type Barrier = (typeof BARRIERS)[number];
export type SupportType = (typeof SUPPORT_TYPES)[number];
