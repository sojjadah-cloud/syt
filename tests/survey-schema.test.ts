import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  EMPTY_VALUES,
  QUESTIONS,
  SECTION_QUESTION_COUNTS,
  completionPercent,
  sectionSchemas,
  submissionSchema,
  type SurveyValues,
} from "@/lib/survey-schema";
import * as cfg from "@/config/survey";
import en from "@/i18n/en";
import ar from "@/i18n/ar";
import { ADMIN_DICTS } from "@/i18n/admin";

export const validValues: SurveyValues = {
  fullName: "Ahmed Salim Al Harthy",
  studentId: "21f12345",
  academicLevel: "LEVEL_4",
  specialisation: cfg.SPECIALISATIONS[0].value,
  iseTrack: "",
  iseTrackOther: "",
  interests: ["COMPETITIONS", "RESEARCH"],
  fields: ["AI_ML", "OTHER"],
  otherField: "Quantum computing",
  proficiency: { AI_ML: 3, OTHER: 2, ROBOTICS: 5 },
  experience: ["HACKATHONS"],
  skills: "Python, MATLAB",
  achievements: "",
  readiness: "VERY_READY",
  weeklyHours: "H2_4",
  teamRole: "PROGRAMMING",
  barriers: ["WORKLOAD"],
  support: ["WORKSHOPS", "MENTORSHIP"],
};

const errorsOf = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join("."), i.message]).reverse()); // first issue wins, as in the form

describe("questionnaire structure", () => {
  it("has exactly 15 questions split 4/3/3/3/2", () => {
    expect(QUESTIONS).toHaveLength(15);
    expect(SECTION_QUESTION_COUNTS).toEqual([4, 3, 3, 3, 2]);
  });

  it("has the required option counts", () => {
    expect(cfg.ACADEMIC_LEVELS).toHaveLength(4);
    expect(cfg.INTEREST_ACTIVITIES).toHaveLength(6);
    expect(cfg.TECHNICAL_FIELDS).toHaveLength(11);
    expect(cfg.EXPERIENCE_TYPES).toHaveLength(6);
    expect(cfg.READINESS).toHaveLength(5);
    expect(cfg.WEEKLY_HOURS).toHaveLength(4);
    expect(cfg.TEAM_ROLES).toHaveLength(7);
    expect(cfg.BARRIERS).toHaveLength(7);
    expect(cfg.SUPPORT_TYPES).toHaveLength(7);
  });
});

describe("translations", () => {
  const keys = (o: unknown, prefix = ""): string[] =>
    o && typeof o === "object"
      ? Object.entries(o).flatMap(([k, v]) => keys(v, `${prefix}${k}.`))
      : [prefix];

  it("Arabic covers every English key", () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });

  it("admin Arabic covers every admin English key", () => {
    expect(keys(ADMIN_DICTS.ar).sort()).toEqual(keys(ADMIN_DICTS.en).sort());
  });

  it("every option has a label in both languages", () => {
    const groups: [readonly (string | number)[], keyof typeof en.options][] = [
      [cfg.ACADEMIC_LEVELS, "academicLevel"],
      [cfg.ISE_TRACKS, "iseTrack"],
      [cfg.INTEREST_ACTIVITIES, "interests"],
      [cfg.TECHNICAL_FIELDS, "fields"],
      [cfg.PROFICIENCY_LEVELS, "proficiency"],
      [cfg.EXPERIENCE_TYPES, "experience"],
      [cfg.READINESS, "readiness"],
      [cfg.WEEKLY_HOURS, "weeklyHours"],
      [cfg.TEAM_ROLES, "teamRole"],
      [cfg.BARRIERS, "barriers"],
      [cfg.SUPPORT_TYPES, "support"],
    ];
    for (const [opts, group] of groups) {
      for (const o of opts) {
        expect((en.options[group] as Record<string, string>)[o], `${group}.${o}`).toBeTruthy();
        expect((ar.options[group] as Record<string, string>)[o], `${group}.${o}`).toBeTruthy();
      }
    }
  });
});

describe("section validation", () => {
  it("rejects an empty section 1 with field-level messages", () => {
    const e = errorsOf(sectionSchemas[0].safeParse(EMPTY_VALUES));
    expect(e).toMatchObject({
      fullName: "required",
      studentId: "required",
      academicLevel: "selectOne",
      specialisation: "specialisationInvalid",
    });
  });

  it("validates English full name and student ID rule", () => {
    const e = errorsOf(sectionSchemas[0].safeParse({ ...validValues, fullName: "أحمد", studentId: "12" }));
    expect(e.fullName).toBe("nameInvalid");
    expect(e.studentId).toBe("studentIdInvalid");
    const single = errorsOf(sectionSchemas[0].safeParse({ ...validValues, fullName: "Ahmed" }));
    expect(single.fullName).toBe("nameInvalid");
  });

  it("limits Q6 to three fields and requires a rating for each", () => {
    const tooMany = errorsOf(
      sectionSchemas[1].safeParse({ ...validValues, fields: ["AI_ML", "SPACE", "ROBOTICS", "SOFTWARE"] }),
    );
    expect(tooMany.fields).toBe("maxThree");
    const unrated = errorsOf(sectionSchemas[1].safeParse({ ...validValues, proficiency: { AI_ML: 3 } }));
    expect(unrated["proficiency.OTHER"]).toBe("proficiencyRequired");
    const noOther = errorsOf(sectionSchemas[1].safeParse({ ...validValues, otherField: "  " }));
    expect(noOther.otherField).toBe("otherRequired");
  });

  it("enforces mutually exclusive 'none' options", () => {
    expect(errorsOf(sectionSchemas[2].safeParse({ ...validValues, experience: ["NONE", "RESEARCH"] })).experience).toBe(
      "exclusive",
    );
    expect(errorsOf(sectionSchemas[4].safeParse({ ...validValues, barriers: ["NONE", "WORKLOAD"] })).barriers).toBe(
      "exclusive",
    );
    expect(sectionSchemas[2].safeParse({ ...validValues, experience: ["NONE"] }).success).toBe(true);
  });

  it("limits Q15 to three selections", () => {
    const e = errorsOf(
      sectionSchemas[4].safeParse({ ...validValues, support: ["WORKSHOPS", "MENTORSHIP", "TEAM_FORMING", "EXTERNAL_EVENTS"] }),
    );
    expect(e.support).toBe("maxThree");
  });

  it("requires an ISE track (and 'Other' text) only for Information Systems Engineering", () => {
    const ise = { ...validValues, specialisation: cfg.ISE_SPECIALISATION };
    expect(errorsOf(sectionSchemas[0].safeParse(ise)).iseTrack).toBe("selectOne");
    expect(errorsOf(sectionSchemas[0].safeParse({ ...ise, iseTrack: "OTHER" })).iseTrackOther).toBe("otherTrackRequired");
    expect(sectionSchemas[0].safeParse({ ...ise, iseTrack: "AI" }).success).toBe(true);
    expect(sectionSchemas[0].safeParse({ ...validValues, iseTrack: "" }).success).toBe(true);
    const r = submissionSchema.safeParse({ ...validValues, iseTrack: "AI", consent: true, idempotencyKey: randomUUID() });
    expect(r.success && r.data.iseTrack).toBe(""); // dropped when specialisation is not ISE
  });

  it("Q10 achievements is optional", () => {
    expect(sectionSchemas[2].safeParse({ ...validValues, achievements: "" }).success).toBe(true);
  });
});

describe("submission payload", () => {
  it("normalises a valid payload", () => {
    const r = submissionSchema.safeParse({ ...validValues, consent: true, idempotencyKey: randomUUID(), locale: "ar" });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.studentId).toBe("21F12345");
    expect(r.data.proficiency).toEqual({ AI_ML: 3, OTHER: 2 });
  });

  it("requires consent and rejects unknown option values", () => {
    const r = submissionSchema.safeParse({
      ...validValues,
      teamRole: "HACKER",
      consent: false,
      idempotencyKey: randomUUID(),
    });
    const e = errorsOf(r);
    expect(e.consent).toBe("consentRequired");
    expect(e.teamRole).toBe("selectOne");
  });

  it("strips control characters", () => {
    const r = submissionSchema.safeParse({
      ...validValues,
      skills: "Python\u0000‮, C++",
      consent: true,
      idempotencyKey: randomUUID(),
    });
    expect(r.success && r.data.skills).toBe("Python, C++");
  });
});

describe("progress", () => {
  it("reflects actual completion of required questions", () => {
    expect(completionPercent(EMPTY_VALUES)).toBe(0);
    expect(completionPercent(validValues)).toBe(100);
    expect(completionPercent({ ...EMPTY_VALUES, fullName: "A B", studentId: "X" })).toBe(14);
  });
});
