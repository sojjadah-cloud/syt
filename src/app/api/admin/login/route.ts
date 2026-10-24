import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/same-origin";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().trim().toLowerCase().max(200), password: z.string().min(1).max(200) });
// Used when the account does not exist so response time does not reveal valid emails.
const DUMMY_HASH = bcrypt.hashSync("no-such-account-placeholder", 12);

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req.headers)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ip = clientIp(req.headers);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { email, password } = parsed.data;

  const byIp = rateLimit(`login-ip:${ip}`, 20, 15 * 60 * 1000);
  const byAccount = rateLimit(`login-acct:${email}`, 5, 15 * 60 * 1000);
  if (!byIp.ok || !byAccount.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.max(byIp.retryAfter, byAccount.retryAfter)) } });
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !admin.active || !valid) {
    await audit(admin?.id ?? null, "login_failed", email);
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await audit(admin.id, "login");

  const res = NextResponse.json({ ok: true, roles: admin.roles, mustChangePassword: admin.mustChangePassword });
  res.cookies.set(SESSION_COOKIE, await signSession(admin.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
