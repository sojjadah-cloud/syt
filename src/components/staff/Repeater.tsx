"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { ErrorText } from "@/components/survey/fields";
import { Button } from "@/components/ui/button";
import type { StaffDictionary } from "@/i18n/staff";
import { useListError } from "./StaffSurvey";

interface Props {
  name: string;
  t: StaffDictionary;
  label: string;
  hint?: string;
  itemLabel: string;
  addLabel: string;
  addAnotherLabel: string;
  titleField: string;
  max?: number;
  newItem: () => Record<string, unknown>;
  renderItem: (index: number) => React.ReactNode;
}

function ItemTitle({ name, index, itemLabel, titleField, t }: { name: string; index: number; itemLabel: string; titleField: string; t: StaffDictionary }) {
  const title = useWatch({ name: `${name}.${index}.${titleField}` }) as string | undefined;
  return (
    <span className="min-w-0 truncate">
      <span className="text-muted">{itemLabel} {index + 1}</span>
      <span className="mx-1.5 text-muted">·</span>
      <span className={title?.trim() ? "text-ink" : "italic text-muted"}>{title?.trim() || t.common.untitled}</span>
    </span>
  );
}

/** Independent repeated entries (opportunities, outcomes, activities, workshops, projects…). */
export function Repeater({ name, t, label, hint, itemLabel, addLabel, addAnotherLabel, titleField, max, newItem, renderItem }: Props) {
  const { control } = useFormContext();
  // keyName keeps each entry's own database `id` intact.
  const { fields, append, remove } = useFieldArray({ control, name, keyName: "_key" as "id" });
  const error = useListError(name, t);
  const canAdd = !max || fields.length < max;

  return (
    <section data-invalid={!!error || undefined} aria-label={label}>
      <h3 className="text-[15px] font-medium leading-snug md:text-base">{label}</h3>
      {hint && <p className="mt-1 text-[13px] leading-relaxed text-muted">{hint}</p>}
      <div className="mt-3 space-y-4">
        {fields.map((f, i) => (
          <details key={(f as unknown as { _key: string })._key} open className="group rounded-xl border border-line bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-[14px] font-medium hover:bg-canvas/60 [&::-webkit-details-marker]:hidden">
              <ItemTitle name={name} index={i} itemLabel={itemLabel} titleField={titleField} t={t} />
              <span className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-brand hover:bg-brand-soft hover:text-brand-deep"
                  onClick={(e) => {
                    e.preventDefault();
                    remove(i);
                  }}
                >
                  {t.common.remove}
                </Button>
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <div className="space-y-5 border-t border-line px-4 py-5">{renderItem(i)}</div>
          </details>
        ))}
      </div>
      {canAdd && (
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => append(newItem())}>
          + {fields.length ? addAnotherLabel : addLabel}
        </Button>
      )}
      <ErrorText id={`${name}-list-e`} message={error} />
    </section>
  );
}
