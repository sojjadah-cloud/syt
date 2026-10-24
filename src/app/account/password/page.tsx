import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell, PageHeader } from "@/components/admin/ui";
import { getAdminI18n } from "@/lib/admin-i18n";
import { getUser } from "@/lib/auth";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Change password | SE Survey Admin" };
export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  const [user, i18n] = await Promise.all([getUser(), getAdminI18n()]);
  if (!user) redirect("/admin/login");
  const t = i18n.s.password;
  return (
    // While a password change is required, the menu is hidden so nothing else can be opened first.
    <AdminShell i18n={i18n} adminName={user.name} active={user.mustChangePassword ? undefined : "password"}>
      <div className="max-w-md">
        <PageHeader title={t.title} />
        {user.mustChangePassword && <p className="mb-5 rounded-xl border border-gold/40 bg-gold-soft px-4 py-3 text-[14px]">{t.mustChange}</p>}
        <PasswordForm t={t} home="/admin" />
      </div>
    </AdminShell>
  );
}
