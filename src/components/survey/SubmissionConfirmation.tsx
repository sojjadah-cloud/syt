"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/i18n/context";

export function SubmissionConfirmation({ referenceNo }: { referenceNo: string }) {
  const { t } = useI18n();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <div className="mx-auto max-w-md py-10 text-center md:py-16">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-success" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 ref={heading} tabIndex={-1} className="mt-6 text-[26px] font-semibold outline-none">
        {t.confirmation.title}
      </h2>
      <p className="mt-2 text-[15px] text-muted">{t.confirmation.message}</p>
      <div className="mt-8 rounded-xl border border-line bg-canvas px-5 py-4">
        <p className="text-[13px] text-muted">{t.confirmation.reference}</p>
        <p dir="ltr" className="mt-1 font-mono text-xl font-semibold tracking-wider text-ink">
          {referenceNo}
        </p>
      </div>
      <p className="mt-4 text-[13px] text-muted">{t.confirmation.keep}</p>
    </div>
  );
}
