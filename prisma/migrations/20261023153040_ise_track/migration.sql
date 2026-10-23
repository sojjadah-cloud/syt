-- CreateEnum
CREATE TYPE "IseTrack" AS ENUM ('CYBERSECURITY', 'AI', 'IT', 'OTHER');

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "iseTrack" "IseTrack",
ADD COLUMN     "iseTrackOther" TEXT;
