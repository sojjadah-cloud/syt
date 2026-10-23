"use client";

import { useWatch } from "react-hook-form";
import { useI18n } from "@/i18n/context";
import { completionPercent, type SurveyValues } from "@/lib/survey-schema";

export function ProgressBar({ step, total }: { step: number; total: number }) {
  const { t, format } = useI18n();
  const values = useWatch<SurveyValues>() as SurveyValues;
  const percent = completionPercent(values);
  const label = step < total ? format(t.survey.sectionOf, { current: step + 1, total }) : t.survey.reviewStep;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-[13px]">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-muted tabular-nums">{format(t.survey.complete, { percent })}</span>
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={format(t.survey.complete, { percent })}
      >
        <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
