import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import {
  countToDb,
  countToForm,
  dateToDb,
  dateToForm,
  levelsToDb,
  levelsToForm,
  orNull,
  showActivities,
  showMentorFields,
  showOpportunities,
  showProjects,
  showWorkshops,
  type ContributionData,
  type ContributionValues,
  type ModuleData,
  type ModuleValues,
  type PathwayData,
  type PathwayValues,
} from "./staff-schema";

type Tx = Prisma.TransactionClient;
type Status = "DRAFT" | "SUBMITTED";

/**
 * Updates repeated entries in place (keeping their ids, review status and initiative links),
 * creates new ones and deletes the ones the user removed. Returns ids in item order.
 */
async function syncItems<T extends { id?: string }>(
  // Prisma delegates share this shape; typed loosely to reuse one helper for every child table.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delegate: any,
  surveyId: string,
  items: T[],
  toData: (item: T, index: number) => Record<string, unknown>,
): Promise<string[]> {
  const existing: { id: string }[] = await delegate.findMany({ where: { surveyId }, select: { id: true } });
  const known = new Set(existing.map((e) => e.id));
  const keep = items.map((i) => i.id).filter((id): id is string => !!id && known.has(id));
  await delegate.deleteMany({ where: { surveyId, id: { notIn: keep } } });
  const ids: string[] = [];
  for (const [i, item] of items.entries()) {
    const data = toData(item, i);
    if (item.id && known.has(item.id)) {
      await delegate.update({ where: { id: item.id }, data });
      ids.push(item.id);
    } else {
      const created = await delegate.create({ data: { surveyId, ...data }, select: { id: true } });
      ids.push(created.id);
    }
  }
  return ids;
}

const stamp = (submit: boolean, wasSubmitted: boolean) =>
  submit ? { status: "SUBMITTED" as const, ...(wasSubmitted ? {} : { submittedAt: new Date() }) } : { status: "DRAFT" as const };

// ===========================================================================
// Survey A
// ===========================================================================

export async function savePathway(profileId: string, id: string | undefined, v: PathwayData, submit: boolean, wasSubmitted: boolean) {
  const fields = {
    competencies: v.competencies,
    activityTypes: v.activityTypes,
    activityTypesOther: v.activityTypes.includes("OTHER") ? v.activityTypesOther : "",
    knowsCompetitions: orNull(v.knowsCompetitions),
    knowsOtherOpportunities: orNull(v.knowsOtherOpportunities),
    targetLevels: levelsToDb(v.targetLevels),
    preparationSkills: v.preparationSkills,
    preparationMethods: v.preparationMethods,
    preparationMethodsOther: v.preparationMethods.includes("OTHER") ? v.preparationMethodsOther : "",
    challenges: v.challenges,
    challengesOther: v.challenges.includes("OTHER") ? v.challengesOther : "",
    partners: v.partners,
    supportNeeded: v.supportNeeded,
    supportDetails: v.supportDetails,
    ...stamp(submit, wasSubmitted),
  };
  return prisma.$transaction(async (tx: Tx) => {
    const survey = id
      ? await tx.pathwaySurvey.update({ where: { id }, data: fields })
      : await tx.pathwaySurvey.create({ data: { profileId, ...fields } });
    await tx.pathwaySurveyPathway.deleteMany({ where: { surveyId: survey.id } });
    if (v.pathways.length) await tx.pathwaySurveyPathway.createMany({ data: v.pathways.map((pathwayCode) => ({ surveyId: survey.id, pathwayCode })) });

    const opportunities = showOpportunities(v) ? v.opportunities : [];
    await syncItems(tx.scientificOpportunity, survey.id, opportunities, (o, i) => ({
      name: o.name || "—",
      type: o.type || "OTHER",
      organiser: o.organiser,
      location: o.location,
      url: o.url,
      expectedDate: dateToDb(o.expectedDate),
      registrationDeadline: dateToDb(o.registrationDeadline),
      targetLevels: levelsToDb(o.targetLevels),
      participation: o.participation || "UNSPECIFIED",
      teamSize: countToDb(o.teamSize),
      requiredFields: o.requiredFields,
      requiredSkills: o.requiredSkills,
      eligibility: o.eligibility,
      preparation: o.preparation,
      preparationDuration: o.preparationDuration,
      equipment: o.equipment,
      supportExpected: o.supportExpected,
      priority: o.priority || "MEDIUM",
      notes: o.notes,
      sortOrder: i,
    }));
    await syncItems(tx.pathwayRecommendation, survey.id, v.recommendations.slice(0, 3), (r, i) => ({
      name: r.name || "—",
      description: r.description,
      benefit: r.benefit,
      priority: r.priority || "MEDIUM",
      period: r.period,
      sortOrder: i,
    }));
    return survey;
  });
}


// ===========================================================================
// Survey B
// ===========================================================================

export async function saveModule(profileId: string, id: string | undefined, v: ModuleData, submit: boolean, wasSubmitted: boolean) {
  return prisma.$transaction(async (tx: Tx) => {
    const module = v.moduleCode
      ? await tx.academicModule.upsert({
          where: { code: v.moduleCode },
          create: { code: v.moduleCode, name: v.moduleName || v.moduleCode },
          update: v.moduleName ? { name: v.moduleName } : {},
        })
      : null;
    const fields = {
      moduleId: module?.id ?? null,
      moduleName: v.moduleName,
      moduleCode: v.moduleCode,
      level: orNull(v.level),
      semester: v.semester,
      overview: v.overview,
      competencies: v.competencies,
      hasPractical: v.hasPractical === "" ? null : v.hasPractical === "YES",
      practicalDetails: v.hasPractical === "YES" ? v.practicalDetails : "",
      canSupportActivity: orNull(v.canSupportActivity),
      resources: v.resources,
      ...stamp(submit, wasSubmitted),
    };
    const survey = id ? await tx.moduleSurvey.update({ where: { id }, data: fields }) : await tx.moduleSurvey.create({ data: { profileId, ...fields } });

    const outcomes = v.outcomes.filter((o) => o.key);
    const outcomeIds = await syncItems(tx.moduleLearningOutcome, survey.id, outcomes, (o, i) => ({
      identifier: o.identifier || "—",
      description: o.description,
      category: o.category,
      sortOrder: i,
    }));
    const keyToId = new Map(outcomes.map((o, i) => [o.key, outcomeIds[i]]));

    const activities = showActivities(v) ? v.activities : [];
    const activityIds = await syncItems(tx.moduleActivity, survey.id, activities, (a, i) => ({
      title: a.title || "—",
      type: a.type || "OTHER",
      description: a.description,
      engineeringProblem: a.engineeringProblem,
      studentTasks: a.studentTasks,
      deliverables: a.deliverables,
      format: a.format || "UNSPECIFIED",
      teamSize: countToDb(a.teamSize),
      duration: a.duration,
      resources: a.resources,
      assessmentMethods: a.assessmentMethods,
      assessmentOther: a.assessmentOther,
      timing: orNull(a.timing),
      competitionPotential: orNull(a.competitionPotential),
      competitionNote: a.competitionNote,
      sortOrder: i,
    }));
    // Explicit activity ↔ learning-outcome links.
    await tx.activityLearningOutcome.deleteMany({ where: { activity: { surveyId: survey.id } } });
    const links = activities.flatMap((a, i) =>
      a.outcomeKeys.map((k) => keyToId.get(k)).filter((x): x is string => !!x).map((outcomeId) => ({ activityId: activityIds[i], outcomeId })),
    );
    if (links.length) await tx.activityLearningOutcome.createMany({ data: links, skipDuplicates: true });
    return survey;
  });
}


// ===========================================================================
// Survey C
// ===========================================================================

export async function saveContribution(profileId: string, id: string | undefined, v: ContributionData, submit: boolean, wasSubmitted: boolean) {
  const fields = {
    expertise: v.expertise,
    expertiseOther: v.expertise.includes("OTHER") ? v.expertiseOther : "",
    supportAreas: v.supportAreas,
    supportAreasOther: v.supportAreas.includes("OTHER") ? v.supportAreasOther : "",
    workshopIntent: orNull(v.workshopIntent),
    projectIntent: orNull(v.projectIntent),
    mentorCompetitions: orNull(v.mentorCompetitions),
    mentorFields: showMentorFields(v) ? v.mentorFields : [],
    deliveryPreferences: v.deliveryPreferences,
    levels: levelsToDb(v.levels),
    duration: orNull(v.duration),
    availability: v.availability,
    availabilityNote: v.availabilityNote,
    collaboration: orNull(v.collaboration),
    resourcesNeeded: v.resourcesNeeded,
    superviseExternal: orNull(v.superviseExternal),
    recommendations: v.recommendations,
    ...stamp(submit, wasSubmitted),
  };
  return prisma.$transaction(async (tx: Tx) => {
    const survey = id
      ? await tx.contributionSurvey.update({ where: { id }, data: fields })
      : await tx.contributionSurvey.create({ data: { profileId, ...fields } });
    await syncItems(tx.proposedWorkshop, survey.id, showWorkshops(v) ? v.workshops : [], (w, i) => ({
      title: w.title || "—",
      field: w.field || "OTHER",
      description: w.description,
      objectives: w.objectives,
      levels: levelsToDb(w.levels),
      prerequisites: w.prerequisites,
      maxParticipants: countToDb(w.maxParticipants),
      format: orNull(w.format),
      duration: w.duration,
      equipment: w.equipment,
      venue: w.venue,
      period: w.period,
      expectedOutcomes: w.expectedOutcomes,
      sortOrder: i,
    }));
    await syncItems(tx.proposedProject, survey.id, showProjects(v) ? v.projects : [], (p, i) => ({
      title: p.title || "—",
      field: p.field || "OTHER",
      problem: p.problem,
      description: p.description,
      expectedOutcomes: p.expectedOutcomes,
      requiredFields: p.requiredFields,
      requiredSkills: p.requiredSkills,
      levels: levelsToDb(p.levels),
      studentCount: countToDb(p.studentCount),
      duration: p.duration,
      resources: p.resources,
      contributionType: orNull(p.contributionType),
      publicationOptions: p.publicationOptions,
      collaboration: p.collaboration,
      sortOrder: i,
    }));
    return survey;
  });
}

