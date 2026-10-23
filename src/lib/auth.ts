import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { SESSION_COOKIE, verifySession } from "./session";

export type AdminSession = { id: string; email: string; name: string };

/** Server-side authorisation: verifies the signed cookie AND that the account is still active. */
export async function getAdmin(): Promise<AdminSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const id = await verifySession(token);
  if (!id) return null;
  const admin = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, email: true, name: true, active: true } });
  if (!admin?.active) return null;
  return { id: admin.id, email: admin.email, name: admin.name };
}

export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function audit(adminId: string | null, action: string, detail?: string) {
  await prisma.auditLog.create({ data: { adminId, action, detail: detail?.slice(0, 500) } }).catch(() => {});
}
