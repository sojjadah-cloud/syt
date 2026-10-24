import "server-only";
import type { AttachmentKind, Prisma } from "@prisma/client";
import { prisma } from "./db";
import {
  countToDb,
  dateToDb,
  levelsToDb,
  orNull,
  showActivities,
  showMentorFields,
  showOpportunities,
  showProjects,
  showWorkshops,
  type AttachmentRef,
  type ContributionData,
  type ModuleData,
  type PathwayData,
} from "./staff-schema";

type Tx = Prisma.TransactionClient;
const submitted = () => ({ status: "SUBMITTED" as const, submittedAt: new Date() });

/** Links uploaded files to the item they were attached to (only files not yet linked). */
async function linkAttachments(tx: Tx, kind: AttachmentKind, parentId: string, refs: AttachmentRef[]) {
  if (!refs.length) return;
  await tx.attachment.updateMany({ where: { id: { in: refs.map((r) => r.id) }, kind: null }, data: { kind, parentId } });
}

// ===========================================================================
// Survey A — Pathway leaders
// ===========================================================================

export async function savePathway(profileId: string, v: PathwayData) {
  return prisma.$transaction(async (tx: Tx) => {
    const survey = await tx.pathwaySurvey.create({
      data: {
        profileId,
        competencies: v.competencies,
        activityTypes: v.activityTypes,
        activityTypesOther: v.activityTypes.includes("OTHER") ? v.activityTypesOther : "",
        knowsCompetitions: orNull(v.knowsCompetitions),
        preparationMethods: v.preparationMethods,
        preparationMethodsOther: v.preparationMethods.includes("OTHER") ? v.preparationMethodsOther : "",
        challenges: v.challenges,
        challengesOther: v.challenges.includes("OTHER") ? v.challengesOther : "",
        partners: v.partners,
        supportNeeded: v.supportNeeded,
        supportDetails: v.supportDetails,
        ...submitted(),
        pathways: { create: v.pathways.map((pathwayCode) => ({ pathwayCode })) },
        recommendations: {
          create: v.recommendations.slice(0, 3).map((r, i) => ({
            name: r.name,
            description: r.description,
            priority: r.priority || "MEDIUM",
            period: r.period,
            sortOrder: i,
          })),
        },
      },
    });
    const opportunities = showOpportunities(v) ? v.opportunities : [];
    for (const [i, o] of opportunities.entries()) {
      const created = await tx.scientificOpportunity.create({
        data: {
          surveyId: survey.id,
          name: o.name,
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
          equipment: o.equipment,
          priority: o.priority || "MEDIUM",
          notes: o.notes,
          sortOrder: i,
        },
        select: { id: true },
      });
      await linkAttachments(tx, "OPPORTUNITY", created.id, o.attachments);
    }
    return survey;
  });
}

// ===========================================================================
// Survey B — TNA module coordinators
// ===========================================================================

export async function saveModule(profileId: string, v: ModuleData) {
  return prisma.$transaction(async (tx: Tx) => {
    const module = await tx.academicModule.upsert({
      where: { code: v.moduleCode },
      create: { code: v.moduleCode, name: v.moduleName || v.moduleCode },
      update: v.moduleName ? { name: v.moduleName } : {},
    });
    const survey = await tx.moduleSurvey.create({
      data: {
        profileId,
        moduleId: module.id,
        moduleName: v.moduleName,
        moduleCode: v.moduleCode,
        level: orNull(v.level),
        semester: v.semester,
        overview: v.overview,
        hasPractical: v.hasPractical === "" ? null : v.hasPractical === "YES",
        practicalDetails: v.hasPractical === "YES" ? v.practicalDetails : "",
        canSupportActivity: orNull(v.canSupportActivity),
        ...submitted(),
      },
    });
    await linkAttachments(tx, "MODULE", survey.id, v.attachments);

    const keyToId = new Map<string, string>();
    for (const [i, o] of v.outcomes.filter((x) => x.key).entries()) {
      const created = await tx.moduleLearningOutcome.create({
        data: { surveyId: survey.id, identifier: o.identifier, description: o.description, category: o.category, sortOrder: i },
        select: { id: true },
      });
      keyToId.set(o.key, created.id);
    }

    const activities = showActivities(v) ? v.activities : [];
    for (const [i, a] of activities.entries()) {
      const outcomeIds = [...new Set(a.outcomeKeys.map((k) => keyToId.get(k)).filter((x): x is string => !!x))];
      const created = await tx.moduleActivity.create({
        data: {
          surveyId: survey.id,
          title: a.title,
          type: a.type || "OTHER",
          description: a.description,
          studentTasks: a.studentTasks,
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
          // Explicit activity ↔ learning-outcome links.
          outcomes: { create: outcomeIds.map((outcomeId) => ({ outcomeId })) },
        },
        select: { id: true },
      });
      await linkAttachments(tx, "ACTIVITY", created.id, a.attachments);
    }
    return survey;
  });
}

// ===========================================================================
// Survey C — Academic & technical staff contributions
// ===========================================================================

export async function saveContribution(profileId: string, v: ContributionData) {
  return prisma.$transaction(async (tx: Tx) => {
    const survey = await tx.contributionSurvey.create({
      data: {
        profileId,
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
        availability: v.availability,
        availabilityNote: v.availabilityNote,
        resourcesNeeded: v.resourcesNeeded,
        recommendations: v.recommendations,
        ...submitted(),
      },
    });
    for (const [i, w] of (showWorkshops(v) ? v.workshops : []).entries()) {
      const created = await tx.proposedWorkshop.create({
        data: {
          surveyId: survey.id,
          title: w.title,
          field: w.field || "OTHER",
          description: w.description,
          levels: levelsToDb(w.levels),
          maxParticipants: countToDb(w.maxParticipants),
          format: orNull(w.format),
          duration: w.duration,
          equipment: w.equipment,
          period: w.period,
          sortOrder: i,
        },
        select: { id: true },
      });
      await linkAttachments(tx, "WORKSHOP", created.id, w.attachments);
    }
    for (const [i, p] of (showProjects(v) ? v.projects : []).entries()) {
      const created = await tx.proposedProject.create({
        data: {
          surveyId: survey.id,
          title: p.title,
          field: p.field || "OTHER",
          problem: p.problem,
          expectedOutcomes: p.expectedOutcomes,
          requiredFields: p.requiredFields,
          levels: levelsToDb(p.levels),
          studentCount: countToDb(p.studentCount),
          duration: p.duration,
          resources: p.resources,
          contributionType: orNull(p.contributionType),
          sortOrder: i,
        },
        select: { id: true },
      });
      await linkAttachments(tx, "PROJECT", created.id, p.attachments);
    }
    return survey;
  });
}
