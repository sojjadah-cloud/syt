"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";

function Arrow({ back }: { back?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 ${back ? "rotate-180 rtl:rotate-0" : "rtl:rotate-180"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M4 10h12m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NavigationButtons({
  onPrevious,
  onNext,
  nextLabel,
  isFinal,
  busy,
}: {
  onPrevious?: () => void;
  onNext: () => void;
  nextLabel?: string;
  isFinal?: boolean;
  busy?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-10 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
      {onPrevious ? (
        <Button type="button" variant="outline" onClick={onPrevious} disabled={busy} className="w-full sm:w-auto">
          <Arrow back />
          {t.survey.previous}
        </Button>
      ) : (
        <span className="hidden sm:block" />
      )}
      <Button
        type="button"
        onClick={onNext}
        disabled={busy}
        aria-busy={busy || undefined}
        className="w-full sm:w-auto sm:min-w-40"
      >
        {busy ? t.survey.submitting : (nextLabel ?? t.survey.next)}
        {!isFinal && !busy && <Arrow />}
      </Button>
    </div>
  );
}
