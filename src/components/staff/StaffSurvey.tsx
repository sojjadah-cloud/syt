"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, useFormContext, type FieldValues } from "react-hook-form";
import type { z } from "zod";
import { FormTextProvider, TextField, type FormText } from "@/components/survey/fields";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "@/i18n/format";
import type { StaffDictionary } from "@/i18n/staff";
import { emptyIdentity, issuesForStep, type Identity } from "@/lib/staff-schema";
import { ThankYouIntro } from "./ThankYouIntro";
import { cn } from "@/lib/utils";

export type SurveyKind = "pathway" | "module" | "contribution";
export type ReviewRow = { label: string; value: string | string[] };

interface Props<V extends FieldValues> {
  kind: SurveyKind;
  t: StaffDictionary;
  title: string;
  note?: string;
  /** The survey's own steps (the "Your details" step is added in front automatically). */
  steps: { title: string; description: string }[];
  /** Field names per step, including ["identity"] first. */
  stepFields: string[][];
  /** Names of repeated-entry arrays; their list-level errors are shown by <Repeater>. */
  repeaters: string[];
  schema: z.ZodType;
  defaultValues: V;
  /** Brings a restored draft up to the current form shape (fills new fields, drops removed ones). */
  normalize?: (values: unknown) => V | null;
  /** Renders the survey's own step (0-based, excluding "Your details"). */
  renderStep: (step: number) => React.ReactNode;
  review: (values: V) => ReviewRow[][];
}

type Issue = { path: PropertyKey[]; message: string };

const IDENTITY_KEY = "se-staff:identity";
/**
 * Bump DRAFT_VERSION whenever the form questions change: drafts saved by an earlier
 * version are deleted on load, so everyone starts from a clean form.
 */
const DRAFT_VERSION = 2;
const draftKey = (kind: SurveyKind) => `se-staff:draft:v${DRAFT_VERSION}:${kind}`;

/** Removes every staff draft stored by older versions of the forms on this device. */
function purgeOldDrafts() {
  try {
    const current = `se-staff:draft:v${DRAFT_VERSION}:`;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith("se-staff:draft:") && !k.startsWith(current)) localStorage.removeItem(k);
    }
  } catch {}
}
const store = {
  get<T>(k: string): T | null {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

function IdentityStep({ t }: { t: StaffDictionary }) {
  const p = t.profile;
  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField name="identity.fullName" label={p.fullName} autoComplete="name" />
        <TextField name="identity.email" label={p.email} hint={t.identity.emailHint} type="email" dir="ltr" autoComplete="email" />
        <TextField name="identity.position" label={p.position} placeholder={p.positionPlaceholder} autoComplete="organization-title" />
        <TextField name="identity.department" label={p.department} />
      </div>
    </>
  );
}

export function StaffSurvey<V extends FieldValues>(props: Props<V>) {
  const { kind, t, stepFields, repeaters, schema, defaultValues, renderStep, review } = props;
  const steps = useMemo(() => [{ title: t.identity.title, description: t.identity.description }, ...props.steps], [t, props.steps]);
  const methods = useForm<V>({ defaultValues: defaultValues as never, mode: "onTouched" });
  const { getValues, setError, clearErrors, watch, reset } = methods;

  const REVIEW = steps.length;
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  // The thank-you message is shown first; the form opens when the person presses the button.
  const [started, setStarted] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const attempted = useRef(new Set<number>());
  const inFlight = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const text: FormText = useMemo(
    () => ({
      required: t.common.required,
      optional: t.common.optional,
      selectPlaceholder: t.common.selectPlaceholder,
      maxSelect: t.common.maxSelect,
      selectAll: t.common.selectAll,
      search: t.common.search,
      errors: t.errors,
      collapseOptional: true,
    }),
    [t],
  );

  // Restore an unsent draft (this device) and the remembered staff details.
  useEffect(() => {
    purgeOldDrafts();
    const draft = store.get<{ values: V; step: number; maxReached: number }>(draftKey(kind));
    const identity = store.get<Identity>(IDENTITY_KEY);
    if (draft?.values) {
      setHasDraft(true);
      const merged = { ...defaultValues, ...draft.values };
      reset((props.normalize?.(merged) ?? merged) as never);
      setStep(Math.min(draft.step ?? 0, REVIEW));
      setMaxReached(Math.min(draft.maxReached ?? 0, REVIEW));
    } else if (identity) {
      reset({ ...defaultValues, identity: { ...emptyIdentity(), ...identity } } as never);
    }
    setReady(true);
  }, [kind, reset, defaultValues, REVIEW]);

  const saveLocal = useCallback(() => {
    store.set(draftKey(kind), { values: getValues(), step, maxReached });
    setSavedAt(new Date());
  }, [kind, getValues, step, maxReached]);

  // Also save when moving between steps (the typing debounce may not have fired yet).
  useEffect(() => {
    if (ready && !done) saveLocal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const errorKey = useCallback(
    (path: PropertyKey[]) => (path.length === 1 && repeaters.includes(String(path[0])) ? `_${String(path[0])}` : path.join(".")),
    [repeaters],
  );

  /** Validates one step against the full rules; shows only that step's messages. */
  const validateStep = useCallback(
    (s: number): Issue[] => {
      const r = schema.safeParse(getValues());
      const fields = stepFields[s];
      clearErrors([...fields, ...fields.map((f) => `_${f}`)] as never);
      if (r.success) return [];
      const issues = issuesForStep(r.error.issues, fields);
      for (const i of issues) setError(errorKey(i.path) as never, { type: "custom", message: i.message });
      return issues;
    },
    [schema, getValues, stepFields, clearErrors, setError, errorKey],
  );

  // Keep the device draft current, and re-check a step the user already tried to leave.
  useEffect(() => {
    if (!ready || done) return;
    let timer: ReturnType<typeof setTimeout>;
    const sub = watch(() => {
      if (attempted.current.has(step)) validateStep(step);
      clearTimeout(timer);
      timer = setTimeout(saveLocal, 600);
    });
    return () => {
      sub.unsubscribe();
      clearTimeout(timer);
    };
  }, [watch, step, validateStep, saveLocal, ready, done]);

  const scrollTop = () =>
    requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      document.getElementById("step-title")?.focus({ preventScroll: true });
    });

  const focusError = () =>
    requestAnimationFrame(() => {
      const el = cardRef.current?.querySelector<HTMLElement>("[data-invalid] input:not([disabled]), [data-invalid] select, [data-invalid] textarea, [data-invalid] button");
      el?.focus();
      el?.closest("[data-invalid]")?.scrollIntoView({ block: "center", behavior: "smooth" });
    });

  const goTo = (s: number) => {
    setMessage(null);
    setStep(s);
    scrollTop();
  };

  const next = () => {
    attempted.current.add(step);
    if (validateStep(step).length) return focusError();
    const n = step + 1;
    setMaxReached((m) => Math.max(m, n));
    if (step === 0) store.set(IDENTITY_KEY, getValues("identity" as never));
    goTo(n);
  };

  const submit = async () => {
    if (inFlight.current) return;
    for (let s = 0; s < steps.length; s++) {
      attempted.current.add(s);
      if (validateStep(s).length) {
        setStep(s);
        setMessage(t.common.errorValidation);
        return focusError();
      }
    }
    inFlight.current = true;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/staff/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: getValues() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; fields?: { path: string; message: string }[] };
      if (res.ok) {
        store.set(draftKey(kind), null);
        store.set(IDENTITY_KEY, getValues("identity" as never));
        setDone(true);
        window.scrollTo({ top: 0 });
        return;
      }
      if (res.status === 400 && data.fields) {
        const issues = data.fields.map((f) => ({ path: f.path.split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p)), message: f.message }));
        const first = stepFields.findIndex((fields) => issuesForStep(issues, fields).length > 0);
        for (const i of issues) setError(errorKey(i.path) as never, { type: "custom", message: i.message });
        if (first >= 0) setStep(first);
        setMessage(t.common.errorValidation);
        return focusError();
      }
      setMessage(t.common.errorSave);
    } catch {
      setMessage(t.common.errorSave);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  const rail = (
    <ol>
      {[...steps, { title: t.common.review, description: "" }].map((s, i) => {
        const state = i === step ? "current" : i < maxReached ? "complete" : "upcoming";
        const reachable = i <= maxReached;
        return (
          <li key={i} className="relative pb-5 last:pb-0">
            {i < steps.length && <span aria-hidden className={cn("absolute start-[15.5px] top-9 bottom-1 w-px", i < maxReached ? "bg-gold/60" : "bg-line")} />}
            <button
              type="button"
              disabled={!reachable}
              onClick={() => goTo(i)}
              aria-current={i === step ? "step" : undefined}
              className={cn("flex w-full items-start gap-3 text-start", reachable ? "cursor-pointer" : "cursor-default")}
            >
              <span
                aria-hidden
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold",
                  state === "current" && "border-brand bg-brand text-white",
                  state === "complete" && "border-gold bg-gold-soft text-[#7a6219]",
                  state === "upcoming" && "border-line bg-white text-muted",
                )}
              >
                {state === "complete" ? "✓" : i + 1}
              </span>
              <span className={cn("pt-1 text-[14px] leading-snug", state === "current" ? "font-semibold text-ink" : state === "complete" ? "text-ink" : "text-muted")}>
                {s.title}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  if (!started && !done) {
    return (
      <ThankYouIntro
        t={t}
        kind={kind}
        resume={hasDraft}
        onStart={() => {
          setStarted(true);
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-success" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mt-5 text-[22px] font-semibold">{t.common.submittedTitle}</h2>
        <p className="mt-2 text-[14px] text-muted">{t.common.submittedText}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/staff" className={buttonVariants({ size: "sm" })}>
            {t.common.another}
          </Link>
          {kind === "module" && (
            <a href="/staff/module" className={buttonVariants({ variant: "outline", size: "sm" })}>
              {t.common.addAnotherModule}
            </a>
          )}
        </div>
      </Card>
    );
  }

  const onReview = step === REVIEW;
  const percent = Math.round((Math.min(step, REVIEW) / REVIEW) * 100);
  const identityRows = (v: V): ReviewRow[] => {
    const i = (v as unknown as { identity: Identity }).identity;
    return [
      { label: t.profile.fullName, value: i.fullName },
      { label: t.profile.email, value: i.email },
      { label: t.profile.position, value: i.position },
      { label: t.profile.department, value: i.department },
    ];
  };

  return (
    <FormTextProvider value={text}>
      <FormProvider {...methods}>
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight md:text-[26px]">{props.title}</h1>
          {props.note && <p className="mt-2 max-w-3xl rounded-lg border border-gold/40 bg-gold-soft/70 px-3 py-2 text-[13px] leading-relaxed">{props.note}</p>}
        </div>
        <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
          <aside className="hidden md:block">
            <nav className="sticky top-6 rounded-2xl border border-line bg-white/70 p-4" aria-label={props.title}>
              {rail}
            </nav>
          </aside>
          <Card ref={cardRef} className="scroll-mt-4 p-5 sm:p-7 lg:p-9">
            <form noValidate onSubmit={(e) => e.preventDefault()}>
              <div className="mb-7">
                <div className="mb-2 flex items-center justify-between gap-3 text-[13px]">
                  <span className="font-medium">{onReview ? t.common.review : format(t.common.stepOf, { current: step + 1, total: steps.length })}</span>
                  <span className="text-muted">{savedAt ? format(t.common.draftSaved, { time: savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }) : ""}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                  <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${percent}%` }} />
                </div>
              </div>

              <header className="mb-7 border-b border-line pb-5">
                <h2 id="step-title" tabIndex={-1} className="text-[20px] font-semibold leading-tight outline-none md:text-[22px]">
                  {onReview ? t.common.reviewTitle : steps[step].title}
                </h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{onReview ? t.common.reviewHint : steps[step].description}</p>
              </header>

              {onReview ? (
                <ReviewList sections={[identityRows(getValues()), ...review(getValues())]} steps={steps} t={t} onEdit={goTo} />
              ) : step === 0 ? (
                <div className="space-y-8">
                  <IdentityStep t={t} />
                </div>
              ) : (
                <div className="space-y-8">{renderStep(step - 1)}</div>
              )}

              {message && (
                <p role="alert" className="mt-6 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-[14px] text-brand-deep">
                  {message}
                </p>
              )}

              <div className="mt-9 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  {step > 0 && (
                    <Button type="button" variant="outline" onClick={() => goTo(step - 1)} disabled={saving} className="flex-1 sm:flex-none">
                      {t.common.previous}
                    </Button>
                  )}
                  <Button type="button" variant="ghost" onClick={saveLocal} disabled={saving} className="flex-1 sm:flex-none" title={t.common.draftLocal}>
                    {t.common.saveDraft}
                  </Button>
                </div>
                <Button type="button" onClick={onReview ? submit : next} disabled={saving} className="w-full sm:w-auto sm:min-w-40">
                  {saving ? t.common.submitting : onReview ? t.common.submit : step === steps.length - 1 ? t.common.review : t.common.next}
                </Button>
              </div>
              <p className="mt-3 text-center text-[12px] text-muted sm:text-end">{t.common.draftLocal}</p>
            </form>
          </Card>
        </div>
      </FormProvider>
    </FormTextProvider>
  );
}

function ReviewList({
  sections,
  steps,
  t,
  onEdit,
}: {
  sections: ReviewRow[][];
  steps: { title: string }[];
  t: StaffDictionary;
  onEdit: (step: number) => void;
}) {
  return (
    <div className="space-y-4">
      {sections.map((rows, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-line">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas/60 px-4 py-2.5">
            <h3 className="text-[14.5px] font-semibold">
              <span className="me-1.5 text-muted">{i + 1}.</span>
              {steps[i].title}
            </h3>
            <Button type="button" variant="link" size="sm" onClick={() => onEdit(i)}>
              {t.common.edit}
            </Button>
          </div>
          <dl className="divide-y divide-line">
            {rows.map((r) => {
              const empty = Array.isArray(r.value) ? r.value.length === 0 : !r.value;
              return (
                <div key={r.label} className="grid gap-1 px-4 py-2.5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-6">
                  <dt className="text-[13px] text-muted">{r.label}</dt>
                  <dd className={cn("text-[14px]", empty && "italic text-muted")}>
                    {empty ? (
                      t.common.unspecified
                    ) : Array.isArray(r.value) ? (
                      <ul className="space-y-0.5">
                        {r.value.map((x, k) => (
                          <li key={k} dir="auto">
                            {x}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span dir="auto" className="whitespace-pre-line break-words">
                        {r.value}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}

/** Shows a list-level validation message for a repeated-entry array (e.g. "add at least one"). */
export function useListError(name: string, t: StaffDictionary) {
  const { formState } = useFormContext();
  const err = (formState.errors as Record<string, { message?: string } | undefined>)[`_${name}`];
  return err?.message ? (t.errors[err.message as keyof StaffDictionary["errors"]] ?? err.message) : undefined;
}
