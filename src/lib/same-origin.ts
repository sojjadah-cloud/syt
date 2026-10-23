/**
 * CSRF guard: a browser request's Origin must match the host it was sent to.
 * Behind a reverse proxy (e.g. Render) the server's own URL is internal, so the
 * public host comes from X-Forwarded-Host / Host rather than req.nextUrl.
 */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (!origin) return true; // non-browser clients; cookies are SameSite=strict anyway
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const publicHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host");
  return !!publicHost && originHost.toLowerCase() === publicHost.toLowerCase();
}
