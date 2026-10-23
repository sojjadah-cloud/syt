import "server-only";
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { SubmissionInput } from "./survey-schema";

// Unambiguous characters (no 0/O, 1/I/L).
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateReference(date = new Date()): string {
  const code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `SE-${date.getUTCFullYear()}-${code}`;
}

let encodingChecked = false;

/** Arabic answers require a UTF-8 database; fail loudly instead of with an obscure driver error. */
async function assertUtf8Database() {
  if (encodingChecked) return;
  const [row] = await prisma.$queryRaw<{ enc: string }[]>`
    SELECT pg_encoding_to_char(encoding) AS enc FROM pg_database WHERE datname = current_database()`;
  if (row?.enc !== "UTF8") {
    throw new Error(`Database encoding is ${row?.enc ?? "unknown"}; it must be UTF8. Recreate it with ENCODING 'UTF8' (see README).`);
  }
  encodingChecked = true;
}

export type CreateResult = { status: "created" | "replayed"; referenceNo: string } | { status: "duplicate" };

export async function createSubmission(input: SubmissionInput): Promise<CreateResult> {
  await assertUtf8Database();
  // A retried request (same idempotency key) returns the original reference.
  const replay = await prisma.submission.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { referenceNo: true, studentId: true },
  });
  if (replay) {
    return replay.studentId === input.studentId ? { status: "replayed", referenceNo: replay.referenceNo } : { status: "duplicate" };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const created = await prisma.submission.create({
        data: {
          referenceNo: generateReference(),
          idempotencyKey: input.idempotencyKey,
          fullName: input.fullName,
          studentId: input.studentId,
          academicLevel: input.academicLevel,
          specialisation: input.specialisation,
          iseTrack: input.iseTrack || null,
          iseTrackOther: input.iseTrackOther || null,
          skillsAndTools: input.skills,
          achievements: input.achievements || null,
          readiness: input.readiness,
          weeklyHours: input.weeklyHours,
          teamRole: input.teamRole,
          locale: input.locale,
          consentAt: new Date(),
          interests: { create: input.interests.map((activity) => ({ activity })) },
          fields: {
            create: input.fields.map((field) => ({
              field,
              proficiency: input.proficiency[field],
              otherText: field === "OTHER" ? input.otherField : null,
            })),
          },
          experiences: { create: input.experience.map((experience) => ({ experience })) },
          barriers: { create: input.barriers.map((barrier) => ({ barrier })) },
          supports: { create: input.support.map((support) => ({ support })) },
        },
        select: { referenceNo: true },
      });
      return { status: "created", referenceNo: created.referenceNo };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const target = String((e.meta?.target as string[] | string | undefined) ?? "");
        if (target.includes("studentId")) return { status: "duplicate" };
        if (target.includes("idempotencyKey")) {
          const again = await prisma.submission.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
          if (again?.studentId === input.studentId) return { status: "replayed", referenceNo: again.referenceNo };
          return { status: "duplicate" };
        }
        if (target.includes("referenceNo")) continue; // extremely unlikely collision — retry with a new code
      }
      throw e;
    }
  }
  throw new Error("Could not allocate a unique reference number");
}
