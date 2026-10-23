"use client";

import { useI18n } from "@/i18n/context";
import { SECTION_QUESTION_COUNTS } from "@/lib/survey-schema";
import { cn } from "@/lib/utils";

interface StepsProps {
  current: number;
  maxReached: number;
  onSelect: (index: number) => void;
}

type Status = "current" | "complete" | "upcoming";
const statusOf = (i: number, current: number, maxReached: number): Status =>
  i === current ? "current" : i < maxReached ? "complete" : "upcoming";

function StepMarker({ index, status }: { index: number; status: Status }) {
  return (
    <span
      className={cn(
        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold",
        status === "current" && "border-brand bg-brand text-white",
        status === "complete" && "border-gold bg-gold-soft text-[#7a6219]",
        status === "upcoming" && "border-line bg-white text-muted",
      )}
      aria-hidden
    >
      {status === "complete" ? (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="m5 10.5 3.2 3L15 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        index + 1
      )}
    </span>
  );
}

function StepText({ title, count, status }: { title: string; count: number; status: Status }) {
  const { t, format } = useI18n();
  return (
    <span className="min-w-0 pt-0.5">
      <span
        className={cn(
          "block text-[14px] leading-snug",
          status === "current" ? "font-semibold text-ink" : status === "complete" ? "font-medium text-ink" : "text-muted",
        )}
      >
        {title}
      </span>
      <span className="mt-0.5 block text-[12.5px] text-muted">
        {format(t.survey.questions, { count })}
        {status === "complete" && <span className="sr-only"> — {t.survey.stepCompleted}</span>}
      </span>
    </span>
  );
}

export function SurveySidebar({ current, maxReached, onSelect }: StepsProps) {
  const { t } = useI18n();
  return (
    <nav aria-label={t.survey.stepsNav} className="rounded-2xl border border-line bg-white/70 p-4 lg:p-5">
      <ol>
        {t.sections.map((s, i) => {
          const status = statusOf(i, current, maxReached);
          const reachable = i <= maxReached;
          return (
            <li key={i} className="relative pb-6 last:pb-0">
              {i < t.sections.length - 1 && (
                <span
                  aria-hidden
                  className={cn("absolute start-[15.5px] top-9 bottom-1 w-px", i < maxReached ? "bg-gold/60" : "bg-line")}
                />
              )}
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onSelect(i)}
                aria-current={status === "current" ? "step" : undefined}
                className={cn("flex w-full items-start gap-3 rounded-lg text-start", reachable ? "cursor-pointer" : "cursor-default")}
              >
                <StepMarker index={i} status={status} />
                <StepText title={s.title} count={SECTION_QUESTION_COUNTS[i]} status={status} />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Compact, collapsible section navigation used on small screens instead of the sidebar. */
export function MobileSteps({ current, maxReached, onSelect }: StepsProps) {
  const { t } = useI18n();
  const total = t.sections.length;
  const title = current < total ? t.sections[current].title : t.survey.reviewStep;
  return (
    <details className="group rounded-xl border border-line bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex gap-1" aria-hidden>
          {t.sections.map((_, i) => (
            <span
              key={i}
              className={cn("h-1.5 w-4 rounded-full", i === current ? "bg-brand" : i < maxReached ? "bg-gold" : "bg-line")}
            />
          ))}
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
          {current < total && (
            <span className="text-muted">
              {current + 1}/{total} ·{" "}
            </span>
          )}
          {title}
        </span>
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="sr-only">{t.survey.stepsNav}</span>
      </summary>
      <ol className="border-t border-line p-2">
        {t.sections.map((s, i) => {
          const status = statusOf(i, current, maxReached);
          return (
            <li key={i}>
              <button
                type="button"
                disabled={i > maxReached}
                onClick={(e) => {
                  (e.currentTarget.closest("details") as HTMLDetailsElement).open = false;
                  onSelect(i);
                }}
                aria-current={status === "current" ? "step" : undefined}
                className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-start enabled:cursor-pointer enabled:hover:bg-canvas"
              >
                <StepMarker index={i} status={status} />
                <StepText title={s.title} count={SECTION_QUESTION_COUNTS[i]} status={status} />
              </button>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
