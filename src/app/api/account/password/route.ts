import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { audit, getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/same-origin";

export const runtime = "nodejs";

const schema = z.object({ current: z.string().min(1).max(200), next: z.string().min(12).max(200) });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req.headers)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`pw:${user.id}`, 10, 15 * 60 * 1000).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "too_short" }, { status: 400 });

  const account = await prisma.adminUser.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await bcrypt.compare(parsed.data.current, account.passwordHash))) {
    return NextResponse.json({ error: "wrong_current" }, { status: 400 });
  }
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.next, 12), mustChangePassword: false },
  });
  await audit(user.id, "password_changed");
  return NextResponse.json({ ok: true });
}
