"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { PROFICIENCY_LEVELS, type TechnicalField } from "@/config/survey";
import { useI18n } from "@/i18n/context";
import type { SurveyValues } from "@/lib/survey-schema";
import { cn } from "@/lib/utils";
import { ErrorText, FieldShell, useFieldError } from "./fields";

function RatingRow({ field, label }: { field: TechnicalField; label: string }) {
  const { control } = useFormContext<SurveyValues>();
  const { t } = useI18n();
  const name = `proficiency.${field}` as const;
  const error = useFieldError(name);
  const errorId = `prof-${field}-e`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: f }) => (
        <fieldset
          data-invalid={!!error || undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn("rounded-xl border p-4", error ? "border-brand/60" : "border-line")}
        >
          <legend className="sr-only">{label}</legend>
          <p aria-hidden className="mb-3 text-[14.5px] font-medium text-ink">
            {label}
          </p>
          <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {PROFICIENCY_LEVELS.map((level, i) => {
              const checked = f.value === level;
              return (
                <label
                  key={level}
                  className={cn(
                    "flex min-w-0 cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-1 py-2 text-center transition-colors",
                    "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand/15",
                    checked ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-gray-300",
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={f.name}
                    value={level}
                    checked={checked}
                    onChange={() => f.onChange(level)}
                    onBlur={f.onBlur}
                    ref={i === 0 ? f.ref : undefined}
                  />
                  <span className="text-[15px] font-semibold tabular-nums">{level}</span>
                  <span className={cn("w-full break-words text-[11px] leading-tight sm:text-[12px]", checked ? "text-white/90" : "text-muted")}>
                    {t.options.proficiency[level]}
                  </span>
                </label>
              );
            })}
          </div>
          <ErrorText id={errorId} message={error} />
        </fieldset>
      )}
    />
  );
}

export function ProficiencyRating({ number }: { number: number }) {
  const { t } = useI18n();
  const fields = (useWatch<SurveyValues>({ name: "fields" }) ?? []) as TechnicalField[];
  const other = useWatch<SurveyValues>({ name: "otherField" }) as string;
  const ids = { control: "prof", hint: "prof-h", error: "prof-e" };

  return (
    <FieldShell group required number={number} label={t.q.proficiency.label} hint={t.q.proficiency.hint} ids={ids}>
      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-4 text-[14px] text-muted">{t.q.proficiency.empty}</p>
      ) : (
        <div className="space-y-3">
          {fields.map((f) => (
            <RatingRow
              key={f}
              field={f}
              label={f === "OTHER" && other?.trim() ? `${t.options.fields.OTHER}: ${other.trim()}` : t.options.fields[f]}
            />
          ))}
        </div>
      )}
    </FieldShell>
  );
}
