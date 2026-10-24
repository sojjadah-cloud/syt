import { describe, expect, it } from "vitest";
import {
  CONTRIBUTION_STEPS,
  MODULE_STEPS,
  PATHWAY_STEPS,
  contributionSubmit,
  emptyActivity,
  emptyContribution,
  emptyModule,
  emptyOpportunity,
  emptyPathway,
  emptyProject,
  emptyWorkshop,
  issuesForStep,
  levelsToDb,
  levelsToForm,
  moduleSubmit,
  pathwaySubmit,
} from "@/lib/staff-schema";
import { STAFF_DICTS } from "@/i18n/staff";

const errs = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join("."), i.message]).reverse());

const identity = { fullName: "Dr Test Staff", email: "Test.Staff@MTC.edu.om", position: "Lecturer", department: "Systems Engineering" };
const file = { id: "cmfile0000000000000000001", name: "brochure.pdf", size: 1200 };

const validPathway = () => ({
  ...emptyPathway(),
  identity,
  pathways: ["COMPUTER"],
  competencies: "Embedded programming and teamwork",
  activityTypes: ["ENGINEERING_COMPETITIONS"],
  knowsCompetitions: "YES",
  opportunities: [{ ...emptyOpportunity(), name: "Robotics Challenge", targetLevels: ["ALL"], requiredFields: ["ROBOTICS", "EMBEDDED_IOT"], attachments: [file] }],
  preparationMethods: ["SPECIALISED_WORKSHOPS"],
  challenges: ["PREPARATION_TIME"],
  recommendations: [{ name: "Internal robotics cup", description: "", priority: "HIGH", period: "Spring" }],
});

describe("staff surveys — pathway leaders", () => {
  it("accepts a complete submission and normalises it", () => {
    const r = pathwaySubmit.safeParse(validPathway());
    expect(errs(r)).toEqual({});
    if (!r.success) return;
    expect(levelsToDb(r.data.opportunities[0].targetLevels)).toEqual(["LEVEL_3", "LEVEL_4", "LEVEL_5", "LEVEL_6"]);
    expect(r.data.identity.email).toBe("test.staff@mtc.edu.om");
    expect(r.data.opportunities[0].attachments).toEqual([file]);
  });

  it("rejects an incomplete submission with field messages", () => {
    const e = errs(pathwaySubmit.safeParse(emptyPathway()));
    expect(e).toMatchObject({ "identity.fullName": "required", pathways: "selectAtLeastOne", competencies: "required", knowsCompetitions: "selectOne" });
  });

  it("asks one opportunities question; opportunities are required only after Yes", () => {
    expect(errs(pathwaySubmit.safeParse({ ...validPathway(), opportunities: [] })).opportunities).toBe("needOpportunity");
    expect(errs(pathwaySubmit.safeParse({ ...validPathway(), knowsCompetitions: "NOT_CURRENTLY", opportunities: [] })).opportunities).toBeUndefined();
  });

  it("validates opportunity formats and leaves unknown details empty", () => {
    const bad = { ...validPathway(), opportunities: [{ ...emptyOpportunity(), name: "X", url: "not a link", expectedDate: "2026-13-45", teamSize: "five" }] };
    const e = errs(pathwaySubmit.safeParse(bad));
    expect(e["opportunities.0.url"]).toBe("url");
    expect(e["opportunities.0.expectedDate"]).toBe("date");
    expect(e["opportunities.0.teamSize"]).toBe("number");
  });

  it("drops option values and attachment ids that are not valid", () => {
    const r = pathwaySubmit.safeParse({
      ...validPathway(),
      pathways: ["COMPUTER", "HACKED"],
      activityTypes: ["NOPE", "HACKATHONS"],
      opportunities: [{ ...validPathway().opportunities[0], attachments: [file, { id: "../../etc/passwd", name: "x", size: 1 }] }],
    });
    expect(r.success && r.data.pathways).toEqual(["COMPUTER"]);
    expect(r.success && r.data.activityTypes).toEqual(["HACKATHONS"]);
    expect(r.success && r.data.opportunities[0].attachments).toEqual([file]);
  });

  it("limits recommendations to three and requires staff details", () => {
    const four = Array.from({ length: 4 }, (_, i) => ({ name: `R${i}`, description: "", priority: "LOW", period: "" }));
    expect(errs(pathwaySubmit.safeParse({ ...validPathway(), recommendations: four })).recommendations).toBe("maxThree");
    const e = errs(pathwaySubmit.safeParse({ ...validPathway(), identity: { ...identity, email: "not-an-email", position: "" } }));
    expect(e["identity.email"]).toBe("email");
    expect(e["identity.position"]).toBe("required");
  });

  it("filters issues to the current step", () => {
    const r = pathwaySubmit.safeParse(emptyPathway());
    const step = issuesForStep(r.error!.issues, PATHWAY_STEPS[1] as string[]).map((i) => i.path[0]);
    expect(new Set(step)).toEqual(new Set(["pathways", "competencies", "activityTypes"]));
  });
});

describe("staff surveys — module coordinators", () => {
  const valid = () => ({
    ...emptyModule(),
    identity,
    moduleName: "Embedded Systems",
    moduleCode: "se3101",
    level: "LEVEL_5",
    semester: "SEMESTER_1",
    overview: "Microcontrollers",
    outcomes: [{ key: "outcome-1", identifier: "LO1", description: "Design an embedded controller", category: "" }],
    hasPractical: "NO",
    canSupportActivity: "YES",
    activities: [
      { ...emptyActivity(), title: "Line follower", description: "Build one", outcomeKeys: ["outcome-1"], assessmentMethods: ["ENGINEERING_PROTOTYPE"], timing: "END", competitionPotential: "INTERNAL" },
    ],
  });

  it("accepts a complete module with linked outcomes", () => {
    const r = moduleSubmit.safeParse(valid());
    expect(errs(r)).toEqual({});
    expect(r.success && r.data.moduleCode).toBe("SE3101");
  });

  it("requires practical details only when there is practical work, and activities when the module can support them", () => {
    expect(errs(moduleSubmit.safeParse({ ...valid(), hasPractical: "YES" })).practicalDetails).toBe("required");
    expect(errs(moduleSubmit.safeParse({ ...valid(), activities: [] })).activities).toBe("needActivity");
    expect(errs(moduleSubmit.safeParse({ ...valid(), canSupportActivity: "NOT_CURRENTLY", activities: [] })).activities).toBeUndefined();
    expect(errs(moduleSubmit.safeParse({ ...valid(), outcomes: [] })).outcomes).toBe("needOutcome");
  });

  it("has four steps covering every field", () => {
    expect(MODULE_STEPS.flat().sort()).toEqual(Object.keys(emptyModule()).sort());
    expect(MODULE_STEPS[0]).toEqual(["identity"]);
  });
});

describe("staff surveys — contributions", () => {
  const valid = () => ({
    ...emptyContribution(),
    identity,
    expertise: ["ROBOTICS"],
    supportAreas: ["TECHNICAL_WORKSHOPS"],
    workshopIntent: "YES",
    workshops: [{ ...emptyWorkshop(), title: "ROS basics", field: "ROBOTICS", description: "Intro", attachments: [file] }],
    projectIntent: "POSSIBLY",
    projects: [{ ...emptyProject(), title: "Rover", field: "ROBOTICS", problem: "Navigation" }],
    mentorCompetitions: "YES",
    mentorFields: ["ROBOTICS"],
    deliveryPreferences: ["LAB_WORKSHOPS"],
    levels: ["LEVEL_4"],
    availability: ["PRIOR_ARRANGEMENT"],
  });

  it("accepts a complete contribution", () => {
    expect(errs(contributionSubmit.safeParse(valid()))).toEqual({});
  });

  it("requires a workshop when the answer is Yes, and competition fields when mentoring", () => {
    expect(errs(contributionSubmit.safeParse({ ...valid(), workshops: [] })).workshops).toBe("needWorkshop");
    expect(errs(contributionSubmit.safeParse({ ...valid(), workshopIntent: "POSSIBLY", workshops: [] })).workshops).toBeUndefined();
    expect(errs(contributionSubmit.safeParse({ ...valid(), mentorFields: [] })).mentorFields).toBe("selectAtLeastOne");
  });

  it("has four steps covering every field", () => {
    expect(CONTRIBUTION_STEPS.flat().sort()).toEqual(Object.keys(emptyContribution()).sort());
    expect(PATHWAY_STEPS.flat().sort()).toEqual(Object.keys(emptyPathway()).sort());
  });
});

describe("question counts (shortened forms)", () => {
  it("keeps the forms short", () => {
    // Fields shown to the user, excluding conditional "other"/detail boxes.
    expect(Object.keys(emptyPathway()).length).toBeLessThanOrEqual(15);
    expect(Object.keys(emptyModule()).length).toBeLessThanOrEqual(12);
    expect(Object.keys(emptyContribution()).length).toBeLessThanOrEqual(17);
    expect(Object.keys(emptyOpportunity()).length).toBeLessThanOrEqual(18);
  });
});

describe("levels conversion", () => {
  it("round-trips All levels", () => {
    expect(levelsToForm(levelsToDb(["ALL"]))).toEqual(["ALL"]);
    expect(levelsToDb(["LEVEL_3", "ALL"])).toHaveLength(4);
    expect(levelsToForm(["LEVEL_4"])).toEqual(["LEVEL_4"]);
  });
});

describe("staff translations", () => {
  const keys = (o: unknown, prefix = ""): string[] =>
    o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => keys(v, `${prefix}${k}.`)) : [prefix];
  it("Arabic covers every English key", () => {
    expect(keys(STAFF_DICTS.ar).sort()).toEqual(keys(STAFF_DICTS.en).sort());
  });
});
