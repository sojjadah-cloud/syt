-- Staff surveys become open forms: a staff profile no longer requires a user account
-- and is identified by email instead. Existing data is preserved.
ALTER TABLE "StaffProfile" ADD COLUMN "email" TEXT;
ALTER TABLE "StaffProfile" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "StaffProfile" DROP CONSTRAINT "StaffProfile_userId_fkey";
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
UPDATE "StaffProfile" p SET "email" = lower(u."email") FROM "AdminUser" u WHERE u."id" = p."userId";
CREATE UNIQUE INDEX "StaffProfile_email_key" ON "StaffProfile"("email");
