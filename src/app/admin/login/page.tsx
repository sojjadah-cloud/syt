import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/ui";
import { getAdminI18n } from "@/lib/admin-i18n";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Staff sign in | SE Survey Admin" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  const i18n = await getAdminI18n();
  const l = i18n.t.login;
  return (
    <AdminShell i18n={i18n}>
      <div className="mx-auto max-w-sm py-10 md:py-16">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card md:p-8">
          <h1 className="text-[22px] font-semibold">{l.title}</h1>
          <p className="mt-1 text-[13px] text-muted">{l.subtitle}</p>
          <LoginForm t={l} />
        </div>
      </div>
    </AdminShell>
  );
}
