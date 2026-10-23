"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/context";
import { EMPTY_VALUES, sectionSchemas, type SurveyValues } from "@/lib/survey-schema";
import { FormSection } from "./FormSection";
import { Header } from "./Header";
import { NavigationButtons } from "./NavigationButtons";
import { ProgressBar } from "./ProgressBar";
import { ReviewScreen } from "./ReviewScreen";
import { SubmissionConfirmation } from "./SubmissionConfirmation";
import { SectionQuestions } from "./SurveySections";
import { MobileSteps, SurveySidebar } from "./SurveySidebar";

const SECTION_COUNT = 5;
const REVIEW = SECTION_COUNT;
const DRAFT_KEY = "se-survey:draft";
const DONE_KEY = "se-survey:submitted";

interface Draft {
  values: SurveyValues;
  step: number;
  maxReached: number;
  idempotencyKey: string;
}

function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeSession(key: string, value: unknown) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function SurveyApp() {
  const { t, locale } = useI18n();
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [submitError, setSubmitError] = useState<keyof typeof t.errors | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [referenceNo, setReferenceNo] = useState<string | null>(null);
  const idempotencyKey = useRef<string>("");
  const inFlight = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Validate only the section that is currently on screen.
  const stepRef = useRef(0);
  stepRef.current = step;
  const resolver = useCallback<Resolver<SurveyValues>>(
    (values, ctx, options) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      zodResolver(sectionSchemas[Math.min(stepRef.current, SECTION_COUNT - 1)] as any)(values, ctx, options as any) as any,
    [],
  );

  const methods = useForm<SurveyValues>({
    defaultValues: EMPTY_VALUES,
    resolver,
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldUnregister: false,
  });
  const { trigger, getValues, reset, watch, clearErrors, getFieldState } = methods;

  // Restore a draft (or a completed submission) from this browser session.
  useEffect(() => {
    const done = readSession<{ referenceNo: string }>(DONE_KEY);
    if (done?.referenceNo) setReferenceNo(done.referenceNo);
    const draft = readSession<Draft>(DRAFT_KEY);
    if (draft?.values) {
      reset({ ...EMPTY_VALUES, ...draft.values });
      setStep(Math.min(Math.max(draft.step ?? 0, 0), REVIEW));
      setMaxReached(Math.min(Math.max(draft.maxReached ?? 0, 0), REVIEW));
    }
    idempotencyKey.current = draft?.idempotencyKey || crypto.randomUUID();
    setHydrated(true);
  }, [reset]);

  // Persist the draft whenever answers or position change.
  const persist = useCallback(() => {
    if (!idempotencyKey.current) return;
    writeSession(DRAFT_KEY, {
      values: getValues(),
      step: stepRef.current,
      maxReached,
      idempotencyKey: idempotencyKey.current,
    } satisfies Draft);
  }, [getValues, maxReached]);

  useEffect(() => {
    if (!hydrated || referenceNo) return;
    persist();
    const sub = watch((_, { name }) => {
      persist();
      // Clear a field's message as soon as it is corrected (choice fields never blur).
      if (name && getFieldState(name).error) void trigger(name);
      if (name === "fields" && (getFieldState("otherField").error || getFieldState("proficiency").error)) {
        void trigger(["otherField", "proficiency"]);
      }
    });
    return () => sub.unsubscribe();
  }, [hydrated, referenceNo, step, persist, watch, getFieldState, trigger]);

  const goTo = useCallback(
    (next: number) => {
      clearErrors();
      setSubmitError(null);
      setStep(next);
      requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
        document.getElementById("section-title")?.focus({ preventScroll: true });
      });
    },
    [clearErrors],
  );

  const focusFirstError = () =>
    requestAnimationFrame(() => {
      const el = cardRef.current?.querySelector<HTMLElement>(
        "[data-invalid] input:not([disabled]), [data-invalid] select, [data-invalid] textarea",
      );
      el?.focus();
      el?.closest("[data-invalid]")?.scrollIntoView({ block: "center", behavior: "smooth" });
    });

  const handleNext = async () => {
    if (!(await trigger())) return focusFirstError();
    const next = step + 1;
    setMaxReached((m) => Math.max(m, next));
    goTo(next);
  };

  const handleSubmit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitError(null);

    // Re-validate every section; jump to the first incomplete one.
    for (let i = 0; i < SECTION_COUNT; i++) {
      stepRef.current = i;
      const ok = await trigger();
      if (!ok) {
        inFlight.current = false;
        setStep(i);
        setMaxReached((m) => Math.max(m, i));
        return focusFirstError();
      }
    }
    stepRef.current = REVIEW;
    clearErrors();
    if (!consent) {
      inFlight.current = false;
      setConsentError(true);
      document.getElementById("consent")?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...getValues(), consent: true, idempotencyKey: idempotencyKey.current, locale }),
      });
      const data = (await res.json().catch(() => ({}))) as { referenceNo?: string; error?: string };
      if (res.ok && data.referenceNo) {
        writeSession(DRAFT_KEY, null);
        writeSession(DONE_KEY, { referenceNo: data.referenceNo });
        setReferenceNo(data.referenceNo);
        window.scrollTo({ top: 0 });
        return;
      }
      setSubmitError(
        res.status === 409 ? "duplicate" : res.status === 429 ? "rateLimited" : res.status === 400 ? "validation" : "server",
      );
    } catch {
      setSubmitError("server");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const onReview = step === REVIEW;

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 md:px-6 md:pt-8 lg:px-8 lg:pt-10">
        <div className="mb-6 md:mb-8">
          <p className="text-[13px] font-medium text-muted">{t.meta.institution}</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-tight tracking-tight text-ink md:text-[28px]">{t.survey.heading}</h1>
        </div>

        <FormProvider {...methods}>
          {referenceNo ? (
            <Card className="p-6 md:p-10">
              <SubmissionConfirmation referenceNo={referenceNo} />
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-8">
              <aside className="hidden md:block">
                <div className="sticky top-6">
                  <SurveySidebar current={step} maxReached={maxReached} onSelect={goTo} />
                </div>
              </aside>
              <div className="md:hidden">
                <MobileSteps current={step} maxReached={maxReached} onSelect={goTo} />
              </div>

              <Card ref={cardRef} className="scroll-mt-4 p-5 sm:p-7 lg:p-10">
                {!hydrated ? (
                  <div className="h-96" aria-busy />
                ) : (
                  <form noValidate onSubmit={(e) => e.preventDefault()}>
                    <div className="mb-8">
                      <ProgressBar step={step} total={SECTION_COUNT} />
                    </div>

                    {onReview ? (
                      <ReviewScreen
                        values={getValues()}
                        onEdit={goTo}
                        consent={consent}
                        onConsentChange={(v) => {
                          setConsent(v);
                          if (v) setConsentError(false);
                        }}
                        consentError={consentError ? t.errors.consentRequired : undefined}
                        submitError={submitError ? t.errors[submitError] : undefined}
                      />
                    ) : (
                      <FormSection title={t.sections[step].title} description={t.sections[step].description}>
                        <SectionQuestions step={step} />
                      </FormSection>
                    )}

                    <NavigationButtons
                      onPrevious={step > 0 ? () => goTo(step - 1) : undefined}
                      onNext={onReview ? handleSubmit : handleNext}
                      nextLabel={onReview ? t.survey.submit : step === SECTION_COUNT - 1 ? t.survey.review : undefined}
                      isFinal={onReview}
                      busy={submitting}
                    />
                    <p className="mt-4 text-center text-[12.5px] text-muted sm:text-end">{t.survey.draftSaved}</p>
                  </form>
                )}
              </Card>
            </div>
          )}
        </FormProvider>
      </main>
    </div>
  );
}
