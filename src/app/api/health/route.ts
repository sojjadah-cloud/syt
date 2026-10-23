// Lightweight liveness probe for Render's health check and the keep-alive ping.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
