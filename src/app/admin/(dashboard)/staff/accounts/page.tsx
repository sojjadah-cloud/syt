import type { Metadata } from "next";
import { AdminShell, PageHeader } from "@/components/admin/ui";
import { Section2 } from "@/components/admin/engagement-ui";
import { buttonVariants } from "@/components/ui/button";
import { setAccountActive } from "@/lib/admin-actions";
import { getAdminI18n } from "@/lib/admin-i18n";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { CreateAccountForm, ResetPasswordButton } from "./AccountForms";

export const metadata: Metadata = { title: "Accounts | SE Survey Admin" };

export default async function AccountsPage() {
  const [admin, i18n] = await Promise.all([requireAdmin(), getAdminI18n()]);
  const a = i18n.e.accounts;
  const users = await prisma.adminUser.findMany({
    where: { roles: { has: "ADMIN" } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, roles: true, active: true, lastLoginAt: true, mustChangePassword: true, profile: { select: { position: true } } },
  });

  return (
    <AdminShell i18n={i18n} adminName={admin.name} active="accounts">
      <PageHeader title={a.title} subtitle={a.subtitle} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Section2 title={a.add}>
          <CreateAccountForm t={a} />
        </Section2>
        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <ul className="divide-y divide-line">
            {users.map((u) => {
              const self = u.id === admin.id;
              return (
                <li key={u.id} className={cn("px-5 py-4", !u.active && "bg-canvas/60")}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <span className="font-medium">{u.name}</span>
                      {self && <span className="ms-2 rounded bg-gold-soft px-1.5 text-[11.5px] text-[#7a6219]">{a.you}</span>}
                      <span className="ms-2 text-[12.5px] text-muted" dir="ltr">
                        {u.email}
                      </span>
                      {u.profile?.position && <span className="ms-2 text-[12.5px] text-muted">· {u.profile.position}</span>}
                    </div>
                    <span className="text-[12px] text-muted">
                      {u.active ? a.active : a.inactive} · {a.lastLogin}: {u.lastLoginAt ? i18n.dateTime(u.lastLoginAt) : a.never}
                    </span>
                  </div>
                  {!self && (
                    <div className="mt-2 flex flex-wrap items-start gap-1">
                      <form action={setAccountActive.bind(null, u.id, !u.active)}>
                        <button className={buttonVariants({ variant: "ghost", size: "sm", className: u.active ? "text-brand" : "" })}>
                          {u.active ? a.deactivate : a.activate}
                        </button>
                      </form>
                      <ResetPasswordButton t={a} userId={u.id} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="border-t border-line px-5 py-3 text-[12px] text-muted">{a.selfProtected}</p>
        </section>
      </div>
    </AdminShell>
  );
}
