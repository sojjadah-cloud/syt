"use client";

import { ISE_SPECIALISATION, SPECIALISATIONS } from "@/config/survey";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/i18n/en";
import { useI18n } from "@/i18n/context";
import type { SurveyValues } from "@/lib/survey-schema";
import { cn } from "@/lib/utils";
import { ErrorText } from "./fields";

type Answer = { number: number; label: string; value: string | string[] };

export function summarise(v: SurveyValues, t: Dictionary, locale: "en" | "ar"): Answer[][] {
  const o = t.options;
  const spec = SPECIALISATIONS.find((s) => s.value === v.specialisation);
  const fieldLabel = (f: (typeof v.fields)[number]) =>
    f === "OTHER" && v.otherField.trim() ? `${o.fields.OTHER}: ${v.otherField.trim()}` : o.fields[f];
  return [
    [
      { number: 1, label: t.q.fullName.label, value: v.fullName },
      { number: 2, label: t.q.studentId.label, value: v.studentId.toUpperCase() },
      { number: 3, label: t.q.academicLevel.label, value: v.academicLevel ? o.academicLevel[v.academicLevel] : "" },
      {
        number: 4,
        label: t.q.specialisation.label,
        value: !spec
          ? ""
          : [
              locale === "ar" ? spec.ar : spec.en,
              v.specialisation === ISE_SPECIALISATION && v.iseTrack
                ? `${t.q.specialisation.trackLabel}: ${v.iseTrack === "OTHER" && v.iseTrackOther.trim() ? v.iseTrackOther.trim() : o.iseTrack[v.iseTrack]}`
                : "",
            ].filter(Boolean),
      },
    ],
    [
      { number: 5, label: t.q.interests.label, value: v.interests.map((k) => o.interests[k]) },
      { number: 6, label: t.q.fields.label, value: v.fields.map(fieldLabel) },
      {
        number: 7,
        label: t.q.proficiency.label,
        value: v.fields.map((f) => {
          const p = v.proficiency[f] as 1 | 2 | 3 | 4 | 5 | undefined;
          return `${fieldLabel(f)} — ${p ? `${p} · ${o.proficiency[p]}` : "—"}`;
        }),
      },
    ],
    [
      { number: 8, label: t.q.experience.label, value: v.experience.map((k) => o.experience[k]) },
      { number: 9, label: t.q.skills.label, value: v.skills },
      { number: 10, label: t.q.achievements.label, value: v.achievements },
    ],
    [
      { number: 11, label: t.q.readiness.label, value: v.readiness ? o.readiness[v.readiness] : "" },
      { number: 12, label: t.q.weeklyHours.label, value: v.weeklyHours ? o.weeklyHours[v.weeklyHours] : "" },
      { number: 13, label: t.q.teamRole.label, value: v.teamRole ? o.teamRole[v.teamRole] : "" },
    ],
    [
      { number: 14, label: t.q.barriers.label, value: v.barriers.map((k) => o.barriers[k]) },
      { number: 15, label: t.q.support.label, value: v.support.map((k) => o.support[k]) },
    ],
  ];
}

export function ReviewScreen({
  values,
  onEdit,
  consent,
  onConsentChange,
  consentError,
  submitError,
}: {
  values: SurveyValues;
  onEdit: (section: number) => void;
  consent: boolean;
  onConsentChange: (v: boolean) => void;
  consentError?: string;
  submitError?: string;
}) {
  const { t, locale } = useI18n();
  const sections = summarise(values, t, locale);

  return (
    <section aria-labelledby="section-title">
      <header className="mb-8 border-b border-line pb-6">
        <h2 id="section-title" tabIndex={-1} className="text-[22px] font-semibold leading-tight outline-none md:text-2xl">
          {t.reviewScreen.title}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{t.reviewScreen.description}</p>
      </header>

      <div className="space-y-4">
        {sections.map((answers, i) => (
          <div key={i} className="rounded-xl border border-line">
            <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas/60 px-4 py-2.5">
              <h3 className="text-[14.5px] font-semibold">
                <span className="me-1.5 text-muted">{i + 1}.</span>
                {t.sections[i].title}
              </h3>
              <Button type="button" variant="link" size="sm" onClick={() => onEdit(i)} aria-label={`${t.reviewScreen.edit}: ${t.sections[i].title}`}>
                {t.reviewScreen.edit}
              </Button>
            </div>
            <dl className="divide-y divide-line">
              {answers.map((a) => {
                const empty = Array.isArray(a.value) ? a.value.length === 0 : !a.value.trim();
                return (
                  <div key={a.number} className="grid gap-1 px-4 py-3 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-6">
                    <dt className="text-[13px] leading-snug text-muted">
                      {a.number}. {a.label}
                    </dt>
                    <dd className={cn("text-[14px] leading-relaxed text-ink", empty && "text-muted italic")}>
                      {empty ? (
                        t.reviewScreen.notProvided
                      ) : Array.isArray(a.value) ? (
                        <ul className="space-y-0.5">
                          {a.value.map((x) => (
                            <li key={x} dir="auto">
                              {x}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span dir="auto" className="whitespace-pre-line break-words">
                          {a.value}
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

      <div className="mt-8 rounded-xl border border-gold/40 bg-gold-soft/60 p-4 md:p-5">
        <h3 className="text-[14.5px] font-semibold">{t.reviewScreen.privacyTitle}</h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink/80">{t.reviewScreen.privacy}</p>
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-[14px] leading-snug has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
          <input
            type="checkbox"
            id="consent"
            checked={consent}
            onChange={(e) => onConsentChange(e.target.checked)}
            aria-invalid={!!consentError}
            aria-describedby={consentError ? "consent-e" : undefined}
            className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-brand"
          />
          <span>
            {t.reviewScreen.consent}
            <span className="ms-1 text-brand" aria-hidden>
              *
            </span>
          </span>
        </label>
        <ErrorText id="consent-e" message={consentError} />
      </div>

      {submitError && (
        <div role="alert" className="mt-6 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-[14px] text-brand-deep">
          {submitError}
        </div>
      )}
    </section>
  );
}
