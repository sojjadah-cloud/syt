"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EngagementDictionary } from "@/i18n/engagement";
import { createAccount, resetPassword, type AccountState } from "@/lib/admin-actions";

function OneTimePassword({ state, label }: { state: AccountState; label: string }) {
  if (!state?.password) return null;
  return (
    <div role="status" className="mt-3 rounded-xl border border-gold/50 bg-gold-soft px-4 py-3 text-[13px]">
      <p>{label}</p>
      <p className="mt-1.5 font-mono text-[15px] font-semibold tracking-wide" dir="ltr">
        {state.email} · {state.password}
      </p>
    </div>
  );
}

export function CreateAccountForm({ t }: { t: EngagementDictionary["accounts"] }) {
  const [state, action, pending] = useActionState(createAccount, null);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium">{t.name}</span>
          <Input name="name" required maxLength={120} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium">{t.email}</span>
          <Input name="email" type="email" required dir="ltr" />
        </label>
      </div>
      {state?.error && (
        <p role="alert" className="text-[13px] text-brand">
          {state.error === "exists" ? t.exists : t.invalid}
        </p>
      )}
      <OneTimePassword state={state} label={t.tempPassword} />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending} className="px-5">
          {t.create}
        </Button>
      </div>
    </form>
  );
}

export function ResetPasswordButton({ t, userId }: { t: EngagementDictionary["accounts"]; userId: string }) {
  const [state, action, pending] = useActionState(resetPassword.bind(null, userId), null);
  return (
    <div>
      <form action={action}>
        <Button type="submit" variant="ghost" size="sm" disabled={pending}>
          {t.resetPassword}
        </Button>
      </form>
      <OneTimePassword state={state} label={t.tempPassword} />
    </div>
  );
}
