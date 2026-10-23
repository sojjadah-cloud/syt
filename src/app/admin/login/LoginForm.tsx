"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminDictionary } from "@/i18n/admin";

export function LoginForm({ t }: { t: AdminDictionary["login"] }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
      });
      if (res.ok) {
        window.location.assign("/admin");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error === "invalid_credentials" ? t.invalid : data.error === "rate_limited" ? t.rateLimited : t.failed);
    } catch {
      setError(t.network);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-[14px] font-medium">
          {t.email}
        </label>
        <Input id="email" name="email" type="email" dir="ltr" autoComplete="username" required />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-[14px] font-medium">
          {t.password}
        </label>
        <Input id="password" name="password" type="password" dir="ltr" autoComplete="current-password" required />
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-brand">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? t.busy : t.submit}
      </Button>
    </form>
  );
}
