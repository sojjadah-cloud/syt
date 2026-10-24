-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('OPPORTUNITY', 'MODULE', 'ACTIVITY', 'WORKSHOP', 'PROJECT');

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "kind" "AttachmentKind",
    "parentId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attachment_kind_parentId_idx" ON "Attachment"("kind", "parentId");

-- CreateIndex
CREATE INDEX "Attachment_createdAt_idx" ON "Attachment"("createdAt");

