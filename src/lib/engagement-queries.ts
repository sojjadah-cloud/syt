import "server-only";
import type { Prisma } from "@prisma/client";
import {
  ACTIVITY_TIMINGS,
  AVAILABILITY,
  COMPETITION_POTENTIAL,
  CONTRIBUTION_TYPES,
  DELIVERY_PREFERENCES,
  EXPERTISE_AREAS,
  MODULE_ACTIVITY_TYPES,
  OPPORTUNITY_TYPES,
  PRIORITIES,
  REVIEW_STATUSES,
  SUPPORT_AREAS,
  WORKSHOP_FORMATS,
} from "@/config/staff";
import { ACADEMIC_LEVELS, SPECIALISATIONS } from "@/config/survey";
import { ci, params, type RawParams } from "./admin-params";

/** Filters shared by the admin list pages and their CSV/Excel exports. Only submitted surveys are included. */

export function opportunityWhere(raw: RawParams): Prisma.ScientificOpportunityWhereInput {
  const p = params(raw);
  const pathway = p.one("pathway", SPECIALISATIONS.map((s) => s.value));
  const level = p.one("level", ACADEMIC_LEVELS);
  const type = p.one("type", OPPORTUNITY_TYPES);
  const priority = p.one("priority", PRIORITIES);
  const status = p.one("status", REVIEW_STATUSES);
  const from = p.date("from");
  const to = p.date("to");
  const country = p.raw("country");
  return {
    survey: { status: "SUBMITTED", ...(pathway ? { pathways: { some: { pathwayCode: pathway } } } : {}) },
    ...(p.q ? { OR: [{ name: ci(p.q) }, { organiser: ci(p.q) }, { requiredSkills: ci(p.q) }, { notes: ci(p.q) }] } : {}),
    ...(type ? { type } : {}),
    ...(level ? { targetLevels: { has: level } } : {}),
    ...(country ? { location: ci(country) } : {}),
    ...(from || to ? { expectedDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    ...(priority ? { priority } : {}),
    ...(status ? { reviewStatus: status } : {}),
  };
}

export function workshopWhere(raw: RawParams): Prisma.ProposedWorkshopWhereInput {
  const p = params(raw);
  const field = p.one("field", EXPERTISE_AREAS);
  const level = p.one("level", ACADEMIC_LEVELS);
  const format = p.one("format", WORKSHOP_FORMATS);
  const status = p.one("status", REVIEW_STATUSES);
  return {
    survey: { status: "SUBMITTED" },
    ...(p.q ? { OR: [{ title: ci(p.q) }, { description: ci(p.q) }, { objectives: ci(p.q) }] } : {}),
    ...(field ? { field } : {}),
    ...(level ? { levels: { has: level } } : {}),
    ...(format ? { format } : {}),
    ...(status ? { reviewStatus: status } : {}),
  };
}

export function projectWhere(raw: RawParams): Prisma.ProposedProjectWhereInput {
  const p = params(raw);
  const field = p.one("field", EXPERTISE_AREAS);
  const level = p.one("level", ACADEMIC_LEVELS);
  const contribution = p.one("contribution", CONTRIBUTION_TYPES);
  const status = p.one("status", REVIEW_STATUSES);
  return {
    survey: { status: "SUBMITTED" },
    ...(p.q ? { OR: [{ title: ci(p.q) }, { problem: ci(p.q) }, { description: ci(p.q) }] } : {}),
    ...(field ? { field } : {}),
    ...(level ? { levels: { has: level } } : {}),
    ...(contribution ? { contributionType: contribution } : {}),
    ...(status ? { reviewStatus: status } : {}),
  };
}

export function moduleWhere(raw: RawParams): Prisma.ModuleSurveyWhereInput {
  const p = params(raw);
  const level = p.one("level", ACADEMIC_LEVELS);
  const potential = p.one("potential", COMPETITION_POTENTIAL);
  const type = p.one("type", MODULE_ACTIVITY_TYPES);
  const timing = p.one("timing", ACTIVITY_TIMINGS);
  return {
    status: "SUBMITTED",
    ...(p.q ? { OR: [{ moduleName: ci(p.q) }, { moduleCode: ci(p.q) }] } : {}),
    ...(level ? { level } : {}),
    ...(potential || type || timing
      ? { activities: { some: { ...(potential ? { competitionPotential: potential } : {}), ...(type ? { type } : {}), ...(timing ? { timing } : {}) } } }
      : {}),
  };
}

/** Staff directory: profiles filtered by their latest submitted contribution survey. */
export function staffWhere(raw: RawParams): Prisma.StaffProfileWhereInput {
  const p = params(raw);
  const expertise = p.one("expertise", EXPERTISE_AREAS);
  const support = p.one("support", SUPPORT_AREAS);
  const delivery = p.one("delivery", DELIVERY_PREFERENCES);
  const level = p.one("level", ACADEMIC_LEVELS);
  const availability = p.one("availability", AVAILABILITY);
  const workshop = p.one("workshop", EXPERTISE_AREAS);
  const research = p.one("research", EXPERTISE_AREAS);
  const contribution: Prisma.ContributionSurveyWhereInput = {
    status: "SUBMITTED",
    ...(expertise ? { expertise: { has: expertise } } : {}),
    ...(support ? { supportAreas: { has: support } } : {}),
    ...(delivery ? { deliveryPreferences: { has: delivery } } : {}),
    ...(level ? { levels: { has: level } } : {}),
    ...(availability ? { availability: { has: availability } } : {}),
    ...(workshop ? { workshops: { some: { field: workshop } } } : {}),
    ...(research ? { projects: { some: { field: research } } } : {}),
  };
  const needsContribution = !!(expertise || support || delivery || level || availability || workshop || research);
  return {
    ...(p.q ? { OR: [{ fullName: ci(p.q) }, { position: ci(p.q) }, { email: ci(p.q) }, { contributions: { some: { recommendations: ci(p.q) } } }] } : {}),
    ...(needsContribution ? { contributions: { some: contribution } } : {}),
  };
}
