"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { StaffDictionary } from "@/i18n/staff";

export function PasswordForm({ t, home }: { t: StaffDictionary["password"]; home: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const current = String(fd.get("current") ?? "");
    const next = String(fd.get("next") ?? "");
    if (next.length < 12) return setError(t.tooShort);
    if (next !== fd.get("confirm")) return setError(t.mismatch);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setDone(true);
      setTimeout(() => window.location.assign(home), 900);
      return;
    }
    const data = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    setError(data?.error === "wrong_current" ? t.wrongCurrent : t.tooShort);
  }

  const label = "mb-1.5 block text-[14px] font-medium";
  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="current" className={label}>{t.current}</label>
          <Input id="current" name="current" type="password" autoComplete="current-password" dir="ltr" required />
        </div>
        <div>
          <label htmlFor="next" className={label}>{t.next}</label>
          <Input id="next" name="next" type="password" autoComplete="new-password" dir="ltr" minLength={12} required />
          <p className="mt-1 text-[12.5px] text-muted">{t.hint}</p>
        </div>
        <div>
          <label htmlFor="confirm" className={label}>{t.confirm}</label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" dir="ltr" minLength={12} required />
        </div>
        {error && <p role="alert" className="text-[13px] text-brand">{error}</p>}
        {done && <p role="status" className="text-[13px] text-success">{t.saved}</p>}
        <Button type="submit" disabled={busy || done} className="w-full">
          {t.save}
        </Button>
      </form>
    </Card>
  );
}
