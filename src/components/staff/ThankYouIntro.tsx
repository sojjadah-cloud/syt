"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { StaffDictionary } from "@/i18n/staff";

/** Opening thank-you message for each staff role, shown before the form starts. */
export function ThankYouIntro({
  t,
  kind,
  resume,
  onStart,
}: {
  t: StaffDictionary;
  kind: "pathway" | "module" | "contribution";
  resume: boolean;
  onStart: () => void;
}) {
  const m = t.intro[kind];
  return (
    <Card className="relative mx-auto max-w-2xl overflow-hidden p-7 sm:p-10">
      <span className="absolute inset-x-0 top-0 h-1 bg-gold" aria-hidden />
      <span className="absolute top-0 h-1 w-24 bg-brand ltr:left-0 rtl:right-0" aria-hidden />
      <p className="text-[12.5px] font-semibold uppercase tracking-wide text-[#7a6219]">{m.role}</p>
      <h1 className="mt-2 text-[24px] font-semibold leading-snug tracking-tight text-ink md:text-[28px]">{m.title}</h1>
      <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-ink/85">
        {m.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div className="mt-6 border-s-2 border-gold/60 ps-3 text-[14px]">
        <p className="text-muted">{t.intro.signature}</p>
        <p className="font-semibold text-ink">{t.intro.department}</p>
      </div>
      <div className="mt-8 flex flex-col-reverse items-center gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
        <p className="text-[13px] text-muted">{t.intro.time}</p>
        <Button type="button" onClick={onStart} className="w-full sm:w-auto sm:min-w-48" autoFocus>
          {resume ? t.intro.resume : t.intro.start}
          <span aria-hidden className="rtl:rotate-180">
            →
          </span>
        </Button>
      </div>
    </Card>
  );
}
