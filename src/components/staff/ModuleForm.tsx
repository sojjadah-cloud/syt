"use client";

import { useWatch } from "react-hook-form";
import { ChoiceField, SelectField, TextField } from "@/components/survey/fields";
import {
  ACTIVITY_TIMINGS,
  ASSESSMENT_METHODS,
  COMPETITION_POTENTIAL,
  MODULE_ACTIVITY_TYPES,
  PARTICIPATION,
  SEMESTERS,
  YES_POSSIBLY_NOT,
} from "@/config/staff";
import { ACADEMIC_LEVELS } from "@/config/survey";
import type { StaffDictionary } from "@/i18n/staff";
import {
  MODULE_STEPS,
  emptyActivity,
  emptyOutcome,
  moduleSubmit,
  showActivities,
  type ModuleValues,
} from "@/lib/staff-schema";
import { FieldGrid, When, Wide, labelOf, labelsOf, opts } from "./form-helpers";
import { Repeater } from "./Repeater";
import { StaffSurvey, type ReviewRow } from "./StaffSurvey";

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k${Date.now()}${Math.random().toString(36).slice(2)}`);

/** Activity ↔ learning outcome links, populated from the outcomes entered in step 2. */
function OutcomeLinks({ index, t }: { index: number; t: StaffDictionary }) {
  const outcomes = (useWatch({ name: "outcomes" }) ?? []) as ModuleValues["outcomes"];
  const options = outcomes
    .filter((o) => o.key && (o.identifier || o.description))
    .map((o) => ({ value: o.key, label: [o.identifier, o.description].filter(Boolean).join(" — ") }));
  if (options.length === 0) return <p className="rounded-lg bg-canvas px-3 py-2 text-[13px] text-muted">{t.module.a.outcomesEmpty}</p>;
  return <ChoiceField compact multiple required={false} name={`activities.${index}.outcomeKeys`} label={t.module.a.outcomes} columns={1} options={options} />;
}

export function ModuleForm({ t, values, pathwayOptions }: { t: StaffDictionary; values: ModuleValues; pathwayOptions: { value: string; label: string }[] }) {
  const m = t.module;
  const o = t.options;

  const renderStep = (step: number) => {
    switch (step) {
      case 0:
        return (
          <>
            <FieldGrid>
              <TextField name="moduleName" number={1} label={m.q1} />
              <TextField name="moduleCode" number={2} label={m.q2} dir="ltr" />
              <SelectField name="level" number={3} label={m.level} options={opts(ACADEMIC_LEVELS, o.levels)} />
              <SelectField name="semester" label={m.semester} options={opts(SEMESTERS, o.semesters)} />
            </FieldGrid>
            <TextField multiline name="overview" number={4} label={m.q4} hint={m.q4Hint} />
          </>
        );
      case 1:
        return (
          <>
            <Repeater
              name="outcomes"
              t={t}
              label={`5. ${m.q5}`}
              hint={m.q5Hint}
              itemLabel={m.outcome}
              addLabel={m.addOutcome}
              addAnotherLabel={m.addOutcome}
              titleField="identifier"
              newItem={() => emptyOutcome(newKey())}
              renderItem={(i) => (
                <FieldGrid>
                  <TextField compact name={`outcomes.${i}.identifier`} label={m.outcomeId} placeholder={m.outcomeIdPlaceholder} dir="ltr" />
                  <TextField compact required={false} name={`outcomes.${i}.category`} label={m.outcomeCategory} />
                  <Wide>
                    <TextField compact multiline rows={2} name={`outcomes.${i}.description`} label={m.outcomeText} dir="auto" />
                  </Wide>
                </FieldGrid>
              )}
            />
            <TextField multiline name="competencies" number={6} label={m.q6} />
            <ChoiceField name="hasPractical" number={7} label={m.q7} columns={2} options={[{ value: "YES", label: t.common.yes }, { value: "NO", label: t.common.no }]} />
            <When name="hasPractical" test={(v: string) => v === "YES"}>
              <TextField multiline rows={3} name="practicalDetails" label={m.q7Details} compact />
            </When>
          </>
        );
      case 2:
        return (
          <>
            <ChoiceField name="canSupportActivity" number={8} label={m.q8} columns={1} options={opts(YES_POSSIBLY_NOT, o.canSupport)} />
            <When name="canSupportActivity" test={(v: string) => showActivities({ canSupportActivity: v })}>
              <Repeater
                name="activities"
                t={t}
                label={`9. ${m.q9}`}
                hint={m.q9Hint}
                itemLabel={m.activity}
                addLabel={m.addActivity}
                addAnotherLabel={m.addAnotherActivity}
                titleField="title"
                newItem={emptyActivity}
                renderItem={(i) => {
                  const n = (k: string) => `activities.${i}.${k}`;
                  return (
                    <FieldGrid>
                      <Wide>
                        <TextField compact name={n("title")} label={m.a.title} />
                      </Wide>
                      <Wide>
                        <ChoiceField compact name={n("type")} label={m.a.type} columns={3} options={opts(MODULE_ACTIVITY_TYPES, o.moduleActivityTypes)} />
                      </Wide>
                      <Wide>
                        <TextField compact multiline rows={3} name={n("description")} label={m.a.description} />
                      </Wide>
                      <TextField compact multiline rows={2} required={false} name={n("engineeringProblem")} label={m.a.problem} />
                      <TextField compact multiline rows={2} required={false} name={n("studentTasks")} label={m.a.tasks} />
                      <TextField compact multiline rows={2} required={false} name={n("deliverables")} label={m.a.deliverables} />
                      <TextField compact multiline rows={2} required={false} name={n("resources")} label={m.a.resources} />
                      <ChoiceField compact required={false} name={n("format")} label={m.a.format} options={opts(PARTICIPATION, o.participation)} />
                      <div className="space-y-5">
                        <TextField compact required={false} type="number" name={n("teamSize")} label={m.a.teamSize} />
                        <TextField compact required={false} name={n("duration")} label={m.a.duration} />
                      </div>
                      <Wide>
                        <OutcomeLinks index={i} t={t} />
                      </Wide>
                      <Wide>
                        <ChoiceField compact multiple name={n("assessmentMethods")} label={m.a.assessment} columns={2} options={opts(ASSESSMENT_METHODS, o.assessment)} />
                      </Wide>
                      <Wide>
                        <TextField compact required={false} name={n("assessmentOther")} label={m.a.assessmentOther} />
                      </Wide>
                      <ChoiceField compact name={n("timing")} label={m.a.timing} columns={1} options={opts(ACTIVITY_TIMINGS, o.timing)} />
                      <div className="space-y-5">
                        <ChoiceField compact name={n("competitionPotential")} label={m.a.competition} columns={1} options={opts(COMPETITION_POTENTIAL, o.competitionPotential)} />
                        <TextField compact multiline rows={2} required={false} name={n("competitionNote")} label={m.a.competitionNote} />
                      </div>
                    </FieldGrid>
                  );
                }}
              />
            </When>
          </>
        );
      default:
        return <TextField multiline required={false} name="resources" number={12} label={m.q12} />;
    }
  };

  const review = (v: ModuleValues): ReviewRow[][] => {
    const outcomeLabel = new Map(v.outcomes.map((x) => [x.key, x.identifier || x.description]));
    return [
      [
        { label: m.q1, value: v.moduleName },
        { label: m.q2, value: v.moduleCode },
        { label: m.q3, value: [labelOf(v.level, o.levels), labelOf(v.semester, o.semesters)].filter(Boolean).join(" · ") },
        { label: m.q4, value: v.overview },
      ],
      [
        { label: m.q5, value: v.outcomes.map((x) => `${x.identifier} — ${x.description}`) },
        { label: m.q6, value: v.competencies },
        { label: m.q7, value: v.hasPractical === "YES" ? `${t.common.yes} — ${v.practicalDetails}` : v.hasPractical === "NO" ? t.common.no : "" },
      ],
      [
        { label: m.q8, value: labelOf(v.canSupportActivity, o.canSupport) },
        ...(showActivities(v)
          ? v.activities.map((a, i) => ({
              label: `${m.activity} ${i + 1}`,
              value: [
                `${a.title || t.common.untitled} — ${labelOf(a.type, o.moduleActivityTypes)}`,
                a.outcomeKeys.length ? `${m.a.outcomes.replace(/\?$/, "")}: ${a.outcomeKeys.map((k) => outcomeLabel.get(k) ?? "").filter(Boolean).join(", ")}` : "",
                labelsOf(a.assessmentMethods, o.assessment).join(", "),
                [labelOf(a.timing, o.timing), labelOf(a.competitionPotential, o.competitionPotential)].filter(Boolean).join(" · "),
              ].filter(Boolean),
            }))
          : []),
      ],
      [{ label: m.q12, value: v.resources }],
    ];
  };

  return (
    <StaffSurvey
      kind="module"
      t={t}
      title={m.title}
      note={m.note}
      steps={m.steps}
      stepFields={MODULE_STEPS as string[][]}
      repeaters={["outcomes", "activities"]}
      schema={moduleSubmit}
      defaultValues={values}
      renderStep={renderStep}
      review={review}
      pathwayOptions={pathwayOptions}
    />
  );
}
