-- CreateEnum
CREATE TYPE "AcademicLevel" AS ENUM ('LEVEL_3', 'LEVEL_4', 'LEVEL_5', 'LEVEL_6');

-- CreateEnum
CREATE TYPE "InterestActivity" AS ENUM ('COMPETITIONS', 'INNOVATION_PROJECTS', 'RESEARCH', 'HACKATHONS', 'CONFERENCES', 'WORKSHOPS');

-- CreateEnum
CREATE TYPE "TechnicalField" AS ENUM ('AI_ML', 'CYBERSECURITY', 'SOFTWARE', 'ROBOTICS', 'EMBEDDED_IOT', 'NETWORKING', 'ELECTRONICS', 'DATA_SCIENCE', 'SPACE', 'DESIGN_3D', 'OTHER');

-- CreateEnum
CREATE TYPE "ExperienceType" AS ENUM ('COMPETITIONS', 'EXTRA_PROJECTS', 'RESEARCH', 'HACKATHONS', 'EXHIBITIONS', 'NONE');

-- CreateEnum
CREATE TYPE "Readiness" AS ENUM ('VERY_READY', 'SCHEDULE_DEPENDENT', 'NEEDS_TRAINING', 'UNSURE', 'NOT_READY');

-- CreateEnum
CREATE TYPE "WeeklyHours" AS ENUM ('LT_2', 'H2_4', 'H5_7', 'GT_7');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('PROGRAMMING', 'DESIGN_PROTOTYPING', 'RESEARCH_ANALYSIS', 'PLANNING_MANAGEMENT', 'LEADERSHIP', 'REPORTS_PRESENTATIONS', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "Barrier" AS ENUM ('WORKLOAD', 'LIMITED_SKILLS', 'LACK_GUIDANCE', 'FINDING_TEAM', 'AWARENESS', 'RESOURCES', 'NONE');

-- CreateEnum
CREATE TYPE "SupportType" AS ENUM ('WORKSHOPS', 'MENTORSHIP', 'LABS_EQUIPMENT', 'COMPETITION_ANNOUNCEMENTS', 'TEAM_FORMING', 'RESEARCH_SUPPORT', 'EXTERNAL_EVENTS');

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicLevel" "AcademicLevel" NOT NULL,
    "specialisation" TEXT NOT NULL,
    "skillsAndTools" TEXT NOT NULL,
    "achievements" TEXT,
    "readiness" "Readiness" NOT NULL,
    "weeklyHours" "WeeklyHours" NOT NULL,
    "teamRole" "TeamRole" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "consentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionInterest" (
    "submissionId" TEXT NOT NULL,
    "activity" "InterestActivity" NOT NULL,

    CONSTRAINT "SubmissionInterest_pkey" PRIMARY KEY ("submissionId","activity")
);

-- CreateTable
CREATE TABLE "SubmissionField" (
    "submissionId" TEXT NOT NULL,
    "field" "TechnicalField" NOT NULL,
    "otherText" TEXT,
    "proficiency" INTEGER NOT NULL,

    CONSTRAINT "SubmissionField_pkey" PRIMARY KEY ("submissionId","field")
);

-- CreateTable
CREATE TABLE "SubmissionExperience" (
    "submissionId" TEXT NOT NULL,
    "experience" "ExperienceType" NOT NULL,

    CONSTRAINT "SubmissionExperience_pkey" PRIMARY KEY ("submissionId","experience")
);

-- CreateTable
CREATE TABLE "SubmissionBarrier" (
    "submissionId" TEXT NOT NULL,
    "barrier" "Barrier" NOT NULL,

    CONSTRAINT "SubmissionBarrier_pkey" PRIMARY KEY ("submissionId","barrier")
);

-- CreateTable
CREATE TABLE "SubmissionSupport" (
    "submissionId" TEXT NOT NULL,
    "support" "SupportType" NOT NULL,

    CONSTRAINT "SubmissionSupport_pkey" PRIMARY KEY ("submissionId","support")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Submission_referenceNo_key" ON "Submission"("referenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_idempotencyKey_key" ON "Submission"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_studentId_key" ON "Submission"("studentId");

-- CreateIndex
CREATE INDEX "Submission_academicLevel_idx" ON "Submission"("academicLevel");

-- CreateIndex
CREATE INDEX "Submission_specialisation_idx" ON "Submission"("specialisation");

-- CreateIndex
CREATE INDEX "Submission_readiness_idx" ON "Submission"("readiness");

-- CreateIndex
CREATE INDEX "Submission_weeklyHours_idx" ON "Submission"("weeklyHours");

-- CreateIndex
CREATE INDEX "Submission_teamRole_idx" ON "Submission"("teamRole");

-- CreateIndex
CREATE INDEX "Submission_createdAt_idx" ON "Submission"("createdAt");

-- CreateIndex
CREATE INDEX "SubmissionInterest_activity_idx" ON "SubmissionInterest"("activity");

-- CreateIndex
CREATE INDEX "SubmissionField_field_proficiency_idx" ON "SubmissionField"("field", "proficiency");

-- CreateIndex
CREATE INDEX "SubmissionExperience_experience_idx" ON "SubmissionExperience"("experience");

-- CreateIndex
CREATE INDEX "SubmissionBarrier_barrier_idx" ON "SubmissionBarrier"("barrier");

-- CreateIndex
CREATE INDEX "SubmissionSupport_support_idx" ON "SubmissionSupport"("support");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "SubmissionInterest" ADD CONSTRAINT "SubmissionInterest_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionField" ADD CONSTRAINT "SubmissionField_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionExperience" ADD CONSTRAINT "SubmissionExperience_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionBarrier" ADD CONSTRAINT "SubmissionBarrier_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionSupport" ADD CONSTRAINT "SubmissionSupport_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
