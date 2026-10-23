import { NextResponse, type NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createSubmission } from "@/lib/submissions";
import { submissionSchema } from "@/lib/survey-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32 * 1024;

const json = (body: object, status: number, headers?: HeadersInit) => NextResponse.json(body, { status, headers });

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return json({ error: "unsupported_media_type" }, 415);

  // Same-origin only.
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return json({ error: "forbidden" }, 403);

  const limit = rateLimit(`submit:${clientIp(req.headers)}`, 10, 10 * 60 * 1000);
  if (!limit.ok) return json({ error: "rate_limited" }, 429, { "Retry-After": String(limit.retryAfter) });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    // Return only field paths and message keys — never echo submitted values.
    const fields = parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return json({ error: "validation", fields }, 400);
  }

  try {
    const result = await createSubmission(parsed.data);
    if (result.status === "duplicate") return json({ error: "duplicate" }, 409);
    return json({ referenceNo: result.referenceNo }, result.status === "created" ? 201 : 200);
  } catch (e) {
    console.error("[submissions] failed to store submission", e instanceof Error ? e.message : e);
    return json({ error: "server" }, 500);
  }
}
