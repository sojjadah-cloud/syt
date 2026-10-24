import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/same-origin";
import { saveContribution, saveModule, savePathway } from "@/lib/staff-save";
import { contributionSubmit, moduleSubmit, pathwaySubmit, type Identity } from "@/lib/staff-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = {
  pathway: { schema: pathwaySubmit, save: savePathway },
  module: { schema: moduleSubmit, save: saveModule },
  contribution: { schema: contributionSubmit, save: saveContribution },
} as const;

const MAX_BODY = 256 * 1024;

/** Staff profiles are matched by email so several contributions link to one person. */
async function upsertProfile(i: Identity, pathways?: string[]) {
  const data = { fullName: i.fullName, position: i.position, department: i.department };
  return prisma.$transaction(async (tx) => {
    const profile = await tx.staffProfile.upsert({ where: { email: i.email }, create: { email: i.email, ...data }, update: data });
    // A pathway leader's pathways (from their survey) are recorded on their profile.
    if (pathways?.length) {
      await tx.staffPathwayAssignment.deleteMany({ where: { profileId: profile.id } });
      await tx.staffPathwayAssignment.createMany({ data: pathways.map((pathwayCode) => ({ profileId: profile.id, pathwayCode })) });
    }
    return profile;
  });
}

/** Public staff survey submission (open form, like the student survey). Body: { data: {...} } */
export async function POST(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const cfg = KINDS[kind as keyof typeof KINDS];
  if (!cfg) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return NextResponse.json({ error: "unsupported_media_type" }, { status: 415 });
  if (!isSameOrigin(req.headers)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const limit = rateLimit(`staff-submit:${clientIp(req.headers)}`, 20, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

  const raw = await req.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  let body: { data?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = cfg.schema.safeParse(body.data ?? {});
  if (!parsed.success) {
    // Field paths and message keys only — never echo submitted values.
    const fields = parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return NextResponse.json({ error: "validation", fields }, { status: 400 });
  }

  try {
    const data = parsed.data as { identity: Identity; pathways?: string[] };
    const profile = await upsertProfile(data.identity, kind === "pathway" ? data.pathways : undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saved = await cfg.save(profile.id, parsed.data as any);
    await audit(null, `staff_${kind}_submitted`, saved.id);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error(`[staff/${kind}] save failed`, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
