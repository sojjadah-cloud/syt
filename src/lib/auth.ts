import "server-only";
import type { StaffRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { SESSION_COOKIE, verifySession } from "./session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  roles: StaffRole[];
  mustChangePassword: boolean;
};
/** Kept for existing admin pages. */
export type AdminSession = SessionUser;

/** Server-side authentication: verifies the signed cookie AND that the account is still active. */
export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const id = await verifySession(token);
  if (!id) return null;
  const u = await prisma.adminUser.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, active: true, roles: true, mustChangePassword: true },
  });
  if (!u?.active) return null;
  return { id: u.id, email: u.email, name: u.name, roles: u.roles, mustChangePassword: u.mustChangePassword };
}

export const hasRole = (u: SessionUser | null, role: StaffRole) => !!u?.roles.includes(role);

/** Administrator only (department administrators). */
export async function getAdmin(): Promise<SessionUser | null> {
  const u = await getUser();
  return hasRole(u, "ADMIN") ? u : null;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect("/admin/login");
  if (u.mustChangePassword) redirect("/account/password");
  if (!hasRole(u, "ADMIN")) redirect("/admin/login");
  return u;
}

export async function audit(adminId: string | null, action: string, detail?: string) {
  await prisma.auditLog.create({ data: { adminId, action, detail: detail?.slice(0, 500) } }).catch(() => {});
}
