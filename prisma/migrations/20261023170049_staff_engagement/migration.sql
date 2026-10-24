-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'PATHWAY_LEADER', 'MODULE_COORDINATOR', 'ACADEMIC_STAFF');

-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "YesNoNotCurrently" AS ENUM ('YES', 'NO', 'NOT_CURRENTLY');

-- CreateEnum
CREATE TYPE "YesPossiblyNot" AS ENUM ('YES', 'POSSIBLY', 'NOT_CURRENTLY');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "Participation" AS ENUM ('INDIVIDUAL', 'TEAM', 'EITHER', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "ScientificActivityType" AS ENUM ('ENGINEERING_COMPETITIONS', 'TECHNICAL_CHALLENGES', 'SCIENTIFIC_RESEARCH', 'INNOVATION_PROJECTS', 'HACKATHONS', 'SCIENTIFIC_CONFERENCES', 'TECHNICAL_EXHIBITIONS', 'INDUSTRY_CHALLENGES', 'PROFESSIONAL_TRAINING', 'ACADEMIC_VISITS', 'OTHER');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('COMPETITION', 'TECHNICAL_CHALLENGE', 'HACKATHON', 'CONFERENCE', 'EXHIBITION', 'RESEARCH_PROGRAMME', 'TRAINING_PROGRAMME', 'INDUSTRY_CHALLENGE', 'OTHER');

-- CreateEnum
CREATE TYPE "PreparationMethod" AS ENUM ('SPECIALISED_WORKSHOPS', 'PRACTICAL_TRAINING', 'INTERNAL_COMPETITIONS', 'TECHNICAL_PROJECTS', 'RESEARCH_GROUPS', 'MENTORING', 'INDUSTRY_COLLABORATION', 'EXTERNAL_TRAINING', 'OTHER');

-- CreateEnum
CREATE TYPE "ParticipationChallenge" AS ENUM ('LIMITED_SKILLS', 'LIMITED_AWARENESS', 'EQUIPMENT_SOFTWARE', 'PREPARATION_TIME', 'SCHEDULE_CONFLICTS', 'TEAM_FORMATION', 'FUNDING_TRAVEL', 'ELIGIBILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "DepartmentSupport" AS ENUM ('FUNDING', 'EQUIPMENT_SOFTWARE', 'LABORATORY_ACCESS', 'TIME_ALLOCATION', 'TRAVEL_LOGISTICS', 'ADDITIONAL_STAFF', 'ADMINISTRATIVE_SUPPORT', 'INDUSTRY_LINKS', 'OTHER');

-- CreateEnum
CREATE TYPE "ModuleActivityType" AS ENUM ('ENGINEERING_PROJECT', 'PRACTICAL_CHALLENGE', 'STUDENT_COMPETITION', 'LABORATORY_ACTIVITY', 'DESIGN_TASK', 'RESEARCH_TASK', 'OTHER');

-- CreateEnum
CREATE TYPE "AssessmentMethod" AS ENUM ('PRACTICAL_DEMONSTRATION', 'ENGINEERING_PROTOTYPE', 'TECHNICAL_SIMULATION', 'PROBLEM_SOLVING', 'LABORATORY_PERFORMANCE', 'TECHNICAL_REPORT', 'PRESENTATION_VIVA', 'TEAM_PROJECT', 'COMPETITION_RUBRIC', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityTiming" AS ENUM ('BEGINNING', 'MIDDLE', 'END', 'THROUGHOUT', 'OUTSIDE_TEACHING', 'TO_BE_DETERMINED');

-- CreateEnum
CREATE TYPE "CompetitionPotential" AS ENUM ('INTERNAL', 'EXTERNAL', 'BOTH', 'NOT_CURRENTLY', 'NEEDS_ASSESSMENT');

-- CreateEnum
CREATE TYPE "ExpertiseArea" AS ENUM ('PROGRAMMING', 'ARTIFICIAL_INTELLIGENCE', 'CYBERSECURITY', 'COMMUNICATIONS', 'NETWORKING', 'EMBEDDED_SYSTEMS', 'ELECTRONICS', 'ROBOTICS', 'AUTOMATION', 'DATA_ANALYTICS', 'ENGINEERING_DESIGN', 'SPACE_SYSTEMS', 'RESEARCH_METHODOLOGY', 'TECHNICAL_WRITING', 'PROJECT_MANAGEMENT', 'INNOVATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportArea" AS ENUM ('ENGINEERING_PROJECTS', 'SCIENTIFIC_RESEARCH', 'TECHNICAL_WORKSHOPS', 'SCIENTIFIC_COMPETITIONS', 'INNOVATION_PROJECTS', 'RESEARCH_WRITING', 'TECHNICAL_MENTORING', 'COMPETITION_PREPARATION', 'PROJECT_EVALUATION', 'INDUSTRY_COLLABORATION', 'OTHER');

-- CreateEnum
CREATE TYPE "MentorWillingness" AS ENUM ('YES', 'DEPENDS', 'NOT_CURRENTLY');

-- CreateEnum
CREATE TYPE "DeliveryPreference" AS ENUM ('LAB_WORKSHOPS', 'CLASSROOM_SESSIONS', 'SHORT_INTENSIVE', 'LONG_TERM_SUPERVISION', 'REGULAR_MENTORING', 'RESEARCH_SUPERVISION', 'REMOTE_SESSIONS', 'JOINT_SESSIONS');

-- CreateEnum
CREATE TYPE "PreferredDuration" AS ENUM ('H1_2', 'H3_4', 'D2_5', 'SEVERAL_WEEKS', 'LONG_TERM', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('WORKING_HOURS', 'AFTER_TEACHING', 'ACTIVITY_PERIODS', 'ACADEMIC_BREAKS', 'PRIOR_ARRANGEMENT');

-- CreateEnum
CREATE TYPE "CollaborationPreference" AS ENUM ('INDIVIDUALLY', 'ACADEMIC_STAFF', 'TECHNICAL_STAFF', 'JOINT_TEAM', 'NO_PREFERENCE');

-- CreateEnum
CREATE TYPE "SuperviseExternal" AS ENUM ('YES', 'DEPENDS_AVAILABILITY', 'DEPENDS_TOPIC', 'NOT_CURRENTLY');

-- CreateEnum
CREATE TYPE "WorkshopFormat" AS ENUM ('LABORATORY', 'CLASSROOM', 'ONLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "StaffContributionType" AS ENUM ('LEAD_SUPERVISOR', 'CO_SUPERVISOR', 'ADVISOR', 'TECHNICAL_SUPPORT');

-- CreateEnum
CREATE TYPE "InitiativeStatus" AS ENUM ('PROPOSED', 'UNDER_REVIEW', 'APPROVED', 'IN_PREPARATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StudentAssignmentStatus" AS ENUM ('SUGGESTED', 'INVITED', 'CONFIRMED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roles" "StaffRole"[] DEFAULT ARRAY[]::"StaffRole"[];

-- CreateTable
CREATE TABLE "AcademicPathway" (
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AcademicPathway_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffPathwayAssignment" (
    "profileId" TEXT NOT NULL,
    "pathwayCode" TEXT NOT NULL,

    CONSTRAINT "StaffPathwayAssignment_pkey" PRIMARY KEY ("profileId","pathwayCode")
);

-- CreateTable
CREATE TABLE "PathwaySurvey" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "SurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "competencies" TEXT NOT NULL DEFAULT '',
    "activityTypes" "ScientificActivityType"[] DEFAULT ARRAY[]::"ScientificActivityType"[],
    "activityTypesOther" TEXT NOT NULL DEFAULT '',
    "knowsCompetitions" "YesNoNotCurrently",
    "knowsOtherOpportunities" "YesNoNotCurrently",
    "targetLevels" "AcademicLevel"[] DEFAULT ARRAY[]::"AcademicLevel"[],
    "preparationSkills" TEXT NOT NULL DEFAULT '',
    "preparationMethods" "PreparationMethod"[] DEFAULT ARRAY[]::"PreparationMethod"[],
    "preparationMethodsOther" TEXT NOT NULL DEFAULT '',
    "challenges" "ParticipationChallenge"[] DEFAULT ARRAY[]::"ParticipationChallenge"[],
    "challengesOther" TEXT NOT NULL DEFAULT '',
    "partners" TEXT NOT NULL DEFAULT '',
    "supportNeeded" "DepartmentSupport"[] DEFAULT ARRAY[]::"DepartmentSupport"[],
    "supportDetails" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PathwaySurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwaySurveyPathway" (
    "surveyId" TEXT NOT NULL,
    "pathwayCode" TEXT NOT NULL,

    CONSTRAINT "PathwaySurveyPathway_pkey" PRIMARY KEY ("surveyId","pathwayCode")
);

-- CreateTable
CREATE TABLE "ScientificOpportunity" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OpportunityType" NOT NULL,
    "organiser" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "expectedDate" TIMESTAMP(3),
    "registrationDeadline" TIMESTAMP(3),
    "targetLevels" "AcademicLevel"[] DEFAULT ARRAY[]::"AcademicLevel"[],
    "participation" "Participation" NOT NULL DEFAULT 'UNSPECIFIED',
    "teamSize" INTEGER,
    "requiredFields" "TechnicalField"[] DEFAULT ARRAY[]::"TechnicalField"[],
    "requiredSkills" TEXT NOT NULL DEFAULT '',
    "eligibility" TEXT NOT NULL DEFAULT '',
    "preparation" TEXT NOT NULL DEFAULT '',
    "preparationDuration" TEXT NOT NULL DEFAULT '',
    "equipment" TEXT NOT NULL DEFAULT '',
    "supportExpected" TEXT NOT NULL DEFAULT '',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScientificOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayRecommendation" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "benefit" TEXT NOT NULL DEFAULT '',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "period" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PathwayRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicModule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleSurvey" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "moduleId" TEXT,
    "status" "SurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "moduleName" TEXT NOT NULL DEFAULT '',
    "moduleCode" TEXT NOT NULL DEFAULT '',
    "level" "AcademicLevel",
    "semester" TEXT NOT NULL DEFAULT '',
    "overview" TEXT NOT NULL DEFAULT '',
    "competencies" TEXT NOT NULL DEFAULT '',
    "hasPractical" BOOLEAN,
    "practicalDetails" TEXT NOT NULL DEFAULT '',
    "canSupportActivity" "YesPossiblyNot",
    "resources" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleLearningOutcome" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ModuleLearningOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleActivity" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ModuleActivityType" NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "engineeringProblem" TEXT NOT NULL DEFAULT '',
    "studentTasks" TEXT NOT NULL DEFAULT '',
    "deliverables" TEXT NOT NULL DEFAULT '',
    "format" "Participation" NOT NULL DEFAULT 'UNSPECIFIED',
    "teamSize" INTEGER,
    "duration" TEXT NOT NULL DEFAULT '',
    "resources" TEXT NOT NULL DEFAULT '',
    "assessmentMethods" "AssessmentMethod"[] DEFAULT ARRAY[]::"AssessmentMethod"[],
    "assessmentOther" TEXT NOT NULL DEFAULT '',
    "timing" "ActivityTiming",
    "competitionPotential" "CompetitionPotential",
    "competitionNote" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLearningOutcome" (
    "activityId" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,

    CONSTRAINT "ActivityLearningOutcome_pkey" PRIMARY KEY ("activityId","outcomeId")
);

-- CreateTable
CREATE TABLE "ContributionSurvey" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "SurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "expertise" "ExpertiseArea"[] DEFAULT ARRAY[]::"ExpertiseArea"[],
    "expertiseOther" TEXT NOT NULL DEFAULT '',
    "supportAreas" "SupportArea"[] DEFAULT ARRAY[]::"SupportArea"[],
    "supportAreasOther" TEXT NOT NULL DEFAULT '',
    "workshopIntent" "YesPossiblyNot",
    "projectIntent" "YesPossiblyNot",
    "mentorCompetitions" "MentorWillingness",
    "mentorFields" "ExpertiseArea"[] DEFAULT ARRAY[]::"ExpertiseArea"[],
    "deliveryPreferences" "DeliveryPreference"[] DEFAULT ARRAY[]::"DeliveryPreference"[],
    "levels" "AcademicLevel"[] DEFAULT ARRAY[]::"AcademicLevel"[],
    "duration" "PreferredDuration",
    "availability" "Availability"[] DEFAULT ARRAY[]::"Availability"[],
    "availabilityNote" TEXT NOT NULL DEFAULT '',
    "collaboration" "CollaborationPreference",
    "resourcesNeeded" TEXT NOT NULL DEFAULT '',
    "superviseExternal" "SuperviseExternal",
    "recommendations" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributionSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposedWorkshop" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "field" "ExpertiseArea" NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "objectives" TEXT NOT NULL DEFAULT '',
    "levels" "AcademicLevel"[] DEFAULT ARRAY[]::"AcademicLevel"[],
    "prerequisites" TEXT NOT NULL DEFAULT '',
    "maxParticipants" INTEGER,
    "format" "WorkshopFormat",
    "duration" TEXT NOT NULL DEFAULT '',
    "equipment" TEXT NOT NULL DEFAULT '',
    "venue" TEXT NOT NULL DEFAULT '',
    "period" TEXT NOT NULL DEFAULT '',
    "expectedOutcomes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposedWorkshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposedProject" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "field" "ExpertiseArea" NOT NULL,
    "problem" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "expectedOutcomes" TEXT NOT NULL DEFAULT '',
    "requiredFields" "TechnicalField"[] DEFAULT ARRAY[]::"TechnicalField"[],
    "requiredSkills" TEXT NOT NULL DEFAULT '',
    "levels" "AcademicLevel"[] DEFAULT ARRAY[]::"AcademicLevel"[],
    "studentCount" INTEGER,
    "duration" TEXT NOT NULL DEFAULT '',
    "resources" TEXT NOT NULL DEFAULT '',
    "contributionType" "StaffContributionType",
    "publicationOptions" TEXT NOT NULL DEFAULT '',
    "collaboration" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposedProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Initiative" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pathwayCode" TEXT,
    "opportunityId" TEXT,
    "workshopId" TEXT,
    "projectId" TEXT,
    "moduleActivityId" TEXT,
    "requiredFields" "TechnicalField"[] DEFAULT ARRAY[]::"TechnicalField"[],
    "targetLevels" "AcademicLevel"[] DEFAULT ARRAY[]::"AcademicLevel"[],
    "preparationPlan" TEXT NOT NULL DEFAULT '',
    "resources" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "InitiativeStatus" NOT NULL DEFAULT 'PROPOSED',
    "notes" TEXT NOT NULL DEFAULT '',
    "outcomes" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Initiative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiativeStaff" (
    "initiativeId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InitiativeStaff_pkey" PRIMARY KEY ("initiativeId","profileId")
);

-- CreateTable
CREATE TABLE "InitiativeStudent" (
    "initiativeId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "status" "StudentAssignmentStatus" NOT NULL DEFAULT 'SUGGESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InitiativeStudent_pkey" PRIMARY KEY ("initiativeId","submissionId")
);

-- CreateTable
CREATE TABLE "InitiativeMilestone" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InitiativeMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiativeStatusChange" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "fromStatus" "InitiativeStatus",
    "toStatus" "InitiativeStatus" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InitiativeStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");

-- CreateIndex
CREATE INDEX "PathwaySurvey_profileId_status_idx" ON "PathwaySurvey"("profileId", "status");

-- CreateIndex
CREATE INDEX "PathwaySurveyPathway_pathwayCode_idx" ON "PathwaySurveyPathway"("pathwayCode");

-- CreateIndex
CREATE INDEX "ScientificOpportunity_type_idx" ON "ScientificOpportunity"("type");

-- CreateIndex
CREATE INDEX "ScientificOpportunity_reviewStatus_idx" ON "ScientificOpportunity"("reviewStatus");

-- CreateIndex
CREATE INDEX "ScientificOpportunity_priority_idx" ON "ScientificOpportunity"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicModule_code_key" ON "AcademicModule"("code");

-- CreateIndex
CREATE INDEX "ModuleSurvey_profileId_status_idx" ON "ModuleSurvey"("profileId", "status");

-- CreateIndex
CREATE INDEX "ContributionSurvey_profileId_status_idx" ON "ContributionSurvey"("profileId", "status");

-- CreateIndex
CREATE INDEX "ProposedWorkshop_field_idx" ON "ProposedWorkshop"("field");

-- CreateIndex
CREATE INDEX "ProposedProject_field_idx" ON "ProposedProject"("field");

-- CreateIndex
CREATE INDEX "Initiative_status_idx" ON "Initiative"("status");

-- CreateIndex
CREATE INDEX "InitiativeStatusChange_initiativeId_createdAt_idx" ON "InitiativeStatusChange"("initiativeId", "createdAt");

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPathwayAssignment" ADD CONSTRAINT "StaffPathwayAssignment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPathwayAssignment" ADD CONSTRAINT "StaffPathwayAssignment_pathwayCode_fkey" FOREIGN KEY ("pathwayCode") REFERENCES "AcademicPathway"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwaySurvey" ADD CONSTRAINT "PathwaySurvey_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwaySurveyPathway" ADD CONSTRAINT "PathwaySurveyPathway_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "PathwaySurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwaySurveyPathway" ADD CONSTRAINT "PathwaySurveyPathway_pathwayCode_fkey" FOREIGN KEY ("pathwayCode") REFERENCES "AcademicPathway"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScientificOpportunity" ADD CONSTRAINT "ScientificOpportunity_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "PathwaySurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayRecommendation" ADD CONSTRAINT "PathwayRecommendation_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "PathwaySurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleSurvey" ADD CONSTRAINT "ModuleSurvey_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleSurvey" ADD CONSTRAINT "ModuleSurvey_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "AcademicModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleLearningOutcome" ADD CONSTRAINT "ModuleLearningOutcome_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "ModuleSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleActivity" ADD CONSTRAINT "ModuleActivity_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "ModuleSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLearningOutcome" ADD CONSTRAINT "ActivityLearningOutcome_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ModuleActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLearningOutcome" ADD CONSTRAINT "ActivityLearningOutcome_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "ModuleLearningOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionSurvey" ADD CONSTRAINT "ContributionSurvey_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposedWorkshop" ADD CONSTRAINT "ProposedWorkshop_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "ContributionSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposedProject" ADD CONSTRAINT "ProposedProject_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "ContributionSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_pathwayCode_fkey" FOREIGN KEY ("pathwayCode") REFERENCES "AcademicPathway"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "ScientificOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "ProposedWorkshop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProposedProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_moduleActivityId_fkey" FOREIGN KEY ("moduleActivityId") REFERENCES "ModuleActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeStaff" ADD CONSTRAINT "InitiativeStaff_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeStaff" ADD CONSTRAINT "InitiativeStaff_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeStudent" ADD CONSTRAINT "InitiativeStudent_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeStudent" ADD CONSTRAINT "InitiativeStudent_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeMilestone" ADD CONSTRAINT "InitiativeMilestone_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeStatusChange" ADD CONSTRAINT "InitiativeStatusChange_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeStatusChange" ADD CONSTRAINT "InitiativeStatusChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data: every account that existed before roles were introduced was a department administrator.
UPDATE "AdminUser" SET "roles" = ARRAY['ADMIN']::"StaffRole"[] WHERE cardinality("roles") = 0;

-- Data: official academic pathways (codes match the student survey specialisations).
INSERT INTO "AcademicPathway" ("code", "nameEn", "nameAr", "sortOrder") VALUES
  ('FOUNDATION', 'Systems Engineering Foundation Year', 'السنة التأسيسية لهندسة النظم', 1),
  ('COMMUNICATION', 'Communication Systems Engineering', 'هندسة أنظمة الاتصالات', 2),
  ('COMPUTER', 'Computer Systems Engineering', 'هندسة أنظمة الحاسوب', 3),
  ('ELECTRICAL_ELECTRONIC', 'Electrical and Electronic System Engineering', 'هندسة الأنظمة الكهربائية والإلكترونية', 4),
  ('GROUND_COMMS_RADAR', 'Ground Communications and Radar System Engineering', 'هندسة أنظمة الاتصالات الأرضية والرادار', 5),
  ('HVACR', 'HVACR System Engineering', 'هندسة أنظمة التدفئة والتهوية والتكييف والتبريد (HVACR)', 6),
  ('MECHATRONICS', 'Mechatronic Systems Engineering', 'هندسة أنظمة الميكاترونكس', 7),
  ('ORDNANCE', 'Ordnance', 'الأسلحة والذخائر (Ordnance)', 8),
  ('POWER', 'Power System Engineering', 'هندسة أنظمة القوى الكهربائية', 9),
  ('VEHICLE', 'Vehicle System Engineering', 'هندسة أنظمة المركبات', 10),
  ('ISE', 'Information Systems Engineering (ISE)', 'هندسة نظم المعلومات (ISE)', 11)
ON CONFLICT ("code") DO NOTHING;
