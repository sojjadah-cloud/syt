"use client";

import { useId } from "react";
import { Controller, get, useFormContext, useFormState, type FieldPath } from "react-hook-form";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useI18n } from "@/i18n/context";
import type { ErrorKey, SurveyValues } from "@/lib/survey-schema";
import { cn } from "@/lib/utils";

type Name = FieldPath<SurveyValues>;

export function useFieldError(name: Name) {
  const { t } = useI18n();
  const { errors } = useFormState<SurveyValues>({ name });
  const key = get(errors, name)?.message as string | undefined;
  return key ? (t.errors[key as ErrorKey] ?? key) : undefined;
}

export function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] text-brand">
      <svg viewBox="0 0 20 20" className="mt-px h-4 w-4 shrink-0" fill="currentColor" aria-hidden>
        <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-.9 4.5h1.8v5h-1.8v-5Zm0 6.5h1.8v1.8h-1.8V13Z" />
      </svg>
      {message}
    </p>
  );
}

interface ShellProps {
  /** Omitted for follow-up sub-questions. */
  number?: number;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  ids: { control: string; hint: string; error: string };
  group?: boolean;
  children: React.ReactNode;
}

/** Shared question chrome: numbered label, required marker, hint and validation message. */
export function FieldShell({ number, label, required, hint, error, ids, group, children }: ShellProps) {
  const { t } = useI18n();
  const labelContent = (
    <>
      {number !== undefined && <span className="me-1.5 text-muted tabular-nums">{number}.</span>}
      {label}
      {required ? (
        <span className="ms-1 text-brand" aria-hidden>
          *
        </span>
      ) : (
        <span className="ms-2 text-[13px] font-normal text-muted">({t.survey.optional})</span>
      )}
      {required && <span className="sr-only"> ({t.survey.required})</span>}
    </>
  );
  const labelClass = "block text-[15px] font-medium leading-snug text-ink md:text-base";
  const hintEl = hint && (
    <p id={ids.hint} className="mt-1 text-[13px] leading-relaxed text-muted">
      {hint}
    </p>
  );

  if (group) {
    return (
      <fieldset data-invalid={!!error || undefined} aria-describedby={cn(hint && ids.hint, error && ids.error) || undefined}>
        <legend className={labelClass}>{labelContent}</legend>
        {hintEl}
        <div className="mt-3">{children}</div>
        <ErrorText id={ids.error} message={error} />
      </fieldset>
    );
  }
  return (
    <div data-invalid={!!error || undefined}>
      <label htmlFor={ids.control} className={labelClass}>
        {labelContent}
      </label>
      {hintEl}
      <div className="mt-2.5">{children}</div>
      <ErrorText id={ids.error} message={error} />
    </div>
  );
}

function useIds() {
  const id = useId();
  return { control: `${id}-c`, hint: `${id}-h`, error: `${id}-e` };
}

interface BaseProps {
  name: Name;
  number?: number;
  label: string;
  hint?: string;
  required?: boolean;
}

export function TextField({
  name,
  number,
  label,
  hint,
  required = true,
  placeholder,
  maxLength,
  autoComplete,
  dir,
  multiline,
}: BaseProps & { placeholder?: string; maxLength?: number; autoComplete?: string; dir?: "ltr" | "auto"; multiline?: boolean }) {
  const { register } = useFormContext<SurveyValues>();
  const error = useFieldError(name);
  const ids = useIds();
  const common = {
    id: ids.control,
    placeholder,
    maxLength,
    dir,
    "aria-invalid": !!error,
    "aria-required": required,
    "aria-describedby": cn(hint && ids.hint, error && ids.error) || undefined,
    ...register(name),
  };
  return (
    <FieldShell number={number} label={label} hint={hint} required={required} error={error} ids={ids}>
      {multiline ? <Textarea rows={4} {...common} /> : <Input autoComplete={autoComplete} {...common} />}
    </FieldShell>
  );
}

export function SelectField({ name, number, label, hint, required = true, options }: BaseProps & { options: { value: string; label: string }[] }) {
  const { register } = useFormContext<SurveyValues>();
  const { t } = useI18n();
  const error = useFieldError(name);
  const ids = useIds();
  return (
    <FieldShell number={number} label={label} hint={hint} required={required} error={error} ids={ids}>
      <NativeSelect
        id={ids.control}
        aria-invalid={!!error}
        aria-required={required}
        aria-describedby={cn(hint && ids.hint, error && ids.error) || undefined}
        {...register(name)}
      >
        <option value="" disabled>
          {t.survey.selectPlaceholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </FieldShell>
  );
}

function Indicator({ type, checked }: { type: "radio" | "checkbox"; checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center border transition-colors",
        type === "radio" ? "rounded-full" : "rounded-[5px]",
        checked ? "border-brand bg-brand" : "border-gray-300 bg-white",
      )}
    >
      {checked &&
        (type === "radio" ? (
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        ) : (
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="m5 10.5 3.2 3L15 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ))}
    </span>
  );
}

interface ChoiceProps extends BaseProps {
  options: { value: string; label: string }[];
  multiple?: boolean;
  /** Maximum number of selections (multiple only). */
  max?: number;
  /** Option that clears, and is cleared by, every other option (multiple only). */
  exclusive?: string;
  columns?: 1 | 2;
  /** Called after a multiple selection changes. */
  onChangeValues?: (values: string[]) => void;
}

/** Radio-button (single) or checkbox-card (multiple) question. */
export function ChoiceField({
  name,
  number,
  label,
  hint,
  required = true,
  options,
  multiple,
  max,
  exclusive,
  columns = 2,
  onChangeValues,
}: ChoiceProps) {
  const { control, getValues } = useFormContext<SurveyValues>();
  const { t, format } = useI18n();
  const error = useFieldError(name);
  const ids = useIds();
  const type = multiple ? "checkbox" : "radio";
  const helper = multiple ? (max ? format(t.survey.maxSelect, { max }) : t.survey.selectAll) : undefined;

  return (
    <FieldShell
      group
      number={number}
      label={label}
      hint={[hint, helper].filter(Boolean).join(" · ") || undefined}
      required={required}
      error={error}
      ids={ids}
    >
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const selected: string[] = multiple ? ((field.value as string[]) ?? []) : field.value ? [field.value as string] : [];
          const atMax = !!max && selected.length >= max;

          const toggle = (value: string) => {
            if (!multiple) return field.onChange(value);
            const current = getValues(name); // live value, not the render snapshot
            const selected: string[] = Array.isArray(current) ? current : [];
            let next: string[];
            if (selected.includes(value)) next = selected.filter((v) => v !== value);
            else if (exclusive && value === exclusive) next = [value];
            else next = [...selected.filter((v) => v !== exclusive), value];
            if (max && next.length > max) return;
            field.onChange(next);
            onChangeValues?.(next);
          };

          return (
            <div
              role={multiple ? "group" : "radiogroup"}
              aria-required={required}
              aria-invalid={!!error}
              className={cn("grid gap-2.5", columns === 2 && "sm:grid-cols-2")}
            >
              {options.map((o, i) => {
                const checked = selected.includes(o.value);
                const disabled = multiple && atMax && !checked;
                return (
                  <label
                    key={o.value}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border px-4 py-3 text-[14.5px] leading-snug transition-colors",
                      "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand/15",
                      checked ? "border-brand bg-brand-soft/50 text-ink" : "border-line bg-white text-ink",
                      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-gray-300",
                      exclusive === o.value && options.length > 2 && columns === 2 && "sm:col-span-2",
                    )}
                  >
                    <input
                      type={type}
                      className="sr-only"
                      name={field.name}
                      value={o.value}
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(o.value)}
                      onBlur={field.onBlur}
                      ref={i === 0 ? field.ref : undefined}
                    />
                    <Indicator type={type} checked={checked} />
                    <span>{o.label}</span>
                  </label>
                );
              })}
            </div>
          );
        }}
      />
    </FieldShell>
  );
}
