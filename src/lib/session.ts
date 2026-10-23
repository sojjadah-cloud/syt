// Edge-compatible admin session token helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "se_admin_session";
export const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("ADMIN_SESSION_SECRET must be set to at least 32 characters");
  return new TextEncoder().encode(s);
}

export async function signSession(adminId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .setAudience("se-survey-admin")
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"], audience: "se-survey-admin" });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
