"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  ACADEMIC_LEVELS,
  BARRIERS,
  EXCLUSIVE_OPTION,
  EXPERIENCE_TYPES,
  INTEREST_ACTIVITIES,
  ISE_SPECIALISATION,
  ISE_TRACKS,
  LIMITS,
  MAX_FIELDS,
  MAX_SUPPORT,
  READINESS,
  SPECIALISATIONS,
  SUPPORT_TYPES,
  TEAM_ROLES,
  TECHNICAL_FIELDS,
  WEEKLY_HOURS,
} from "@/config/survey";
import { useI18n } from "@/i18n/context";
import type { SurveyValues } from "@/lib/survey-schema";
import { ChoiceField, ErrorText, SelectField, TextField, useFieldError } from "./fields";
import { ProficiencyRating } from "./ProficiencyRating";

const opts = <K extends string>(keys: readonly K[], labels: Record<K, string>) =>
  keys.map((value) => ({ value, label: labels[value] }));

function OtherFieldInput() {
  const { register } = useFormContext<SurveyValues>();
  const { t } = useI18n();
  const fields = useWatch<SurveyValues>({ name: "fields" }) as string[];
  const error = useFieldError("otherField");
  if (!fields?.includes("OTHER")) return null;
  return (
    <div className="-mt-4 ps-0 sm:max-w-md">
      <label htmlFor="otherField" className="sr-only">
        {t.q.fields.otherLabel}
      </label>
      <Input
        id="otherField"
        placeholder={t.q.fields.otherPlaceholder}
        maxLength={LIMITS.otherField}
        aria-invalid={!!error}
        aria-describedby={error ? "otherField-e" : undefined}
        {...register("otherField")}
      />
      <ErrorText id="otherField-e" message={error} />
    </div>
  );
}

/** Q4 follow-up: shown only for Information Systems Engineering. */
function IseTrackField() {
  const { register } = useFormContext<SurveyValues>();
  const { t } = useI18n();
  const [spec, track] = useWatch<SurveyValues>({ name: ["specialisation", "iseTrack"] }) as [string, string];
  const otherError = useFieldError("iseTrackOther");
  if (spec !== ISE_SPECIALISATION) return null;
  return (
    <div className="-mt-4 rounded-xl border border-line bg-canvas/50 p-4 sm:p-5">
      <ChoiceField name="iseTrack" label={t.q.specialisation.trackLabel} options={opts(ISE_TRACKS, t.options.iseTrack)} />
      {track === "OTHER" && (
        <div className="mt-3 sm:max-w-md">
          <label htmlFor="iseTrackOther" className="sr-only">
            {t.q.specialisation.trackOtherLabel}
          </label>
          <Input
            id="iseTrackOther"
            placeholder={t.q.specialisation.trackOtherPlaceholder}
            maxLength={LIMITS.otherField}
            aria-invalid={!!otherError}
            aria-describedby={otherError ? "iseTrackOther-e" : undefined}
            {...register("iseTrackOther")}
          />
          <ErrorText id="iseTrackOther-e" message={otherError} />
        </div>
      )}
    </div>
  );
}

export function SectionQuestions({ step }: { step: number }) {
  const { t, locale } = useI18n();
  const o = t.options;

  switch (step) {
    case 0:
      return (
        <>
          <TextField
            name="fullName"
            number={1}
            label={t.q.fullName.label}
            placeholder={t.q.fullName.placeholder}
            maxLength={LIMITS.fullName}
            autoComplete="name"
            dir="ltr"
          />
          <TextField
            name="studentId"
            number={2}
            label={t.q.studentId.label}
            placeholder={t.q.studentId.placeholder}
            maxLength={LIMITS.studentId}
            autoComplete="off"
            dir="ltr"
          />
          <ChoiceField
            name="academicLevel"
            number={3}
            label={t.q.academicLevel.label}
            options={opts(ACADEMIC_LEVELS, o.academicLevel)}
          />
          <SelectField
            name="specialisation"
            number={4}
            label={t.q.specialisation.label}
            options={SPECIALISATIONS.map((s) => ({ value: s.value, label: locale === "ar" ? s.ar : s.en }))}
          />
          <IseTrackField />
        </>
      );
    case 1:
      return (
        <>
          <ChoiceField multiple name="interests" number={5} label={t.q.interests.label} options={opts(INTEREST_ACTIVITIES, o.interests)} />
          <ChoiceField
            multiple
            name="fields"
            number={6}
            label={t.q.fields.label}
            max={MAX_FIELDS}
            options={opts(TECHNICAL_FIELDS, o.fields)}
          />
          <OtherFieldInput />
          <ProficiencyRating number={7} />
        </>
      );
    case 2:
      return (
        <>
          <ChoiceField
            multiple
            name="experience"
            number={8}
            label={t.q.experience.label}
            exclusive={EXCLUSIVE_OPTION}
            options={opts(EXPERIENCE_TYPES, o.experience)}
          />
          <TextField
            name="skills"
            number={9}
            label={t.q.skills.label}
            placeholder={t.q.skills.placeholder}
            maxLength={LIMITS.skillsAndTools}
            dir="auto"
          />
          <TextField
            multiline
            required={false}
            name="achievements"
            number={10}
            label={t.q.achievements.label}
            hint={t.q.achievements.hint}
            placeholder={t.q.achievements.placeholder}
            maxLength={LIMITS.achievements}
            dir="auto"
          />
        </>
      );
    case 3:
      return (
        <>
          <ChoiceField name="readiness" number={11} label={t.q.readiness.label} columns={1} options={opts(READINESS, o.readiness)} />
          <ChoiceField name="weeklyHours" number={12} label={t.q.weeklyHours.label} options={opts(WEEKLY_HOURS, o.weeklyHours)} />
          <ChoiceField name="teamRole" number={13} label={t.q.teamRole.label} options={opts(TEAM_ROLES, o.teamRole)} />
        </>
      );
    case 4:
      return (
        <>
          <ChoiceField
            multiple
            name="barriers"
            number={14}
            label={t.q.barriers.label}
            exclusive={EXCLUSIVE_OPTION}
            options={opts(BARRIERS, o.barriers)}
          />
          <ChoiceField
            multiple
            name="support"
            number={15}
            label={t.q.support.label}
            max={MAX_SUPPORT}
            options={opts(SUPPORT_TYPES, o.support)}
          />
        </>
      );
    default:
      return null;
  }
}
