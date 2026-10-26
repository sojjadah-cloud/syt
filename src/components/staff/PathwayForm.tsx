"use client";

import { ChoiceField, TextField } from "@/components/survey/fields";
import {
  ALL_LEVELS,
  DEPARTMENT_SUPPORT,
  LEVEL_OPTIONS,
  OPPORTUNITY_TYPES,
  PARTICIPATION,
  PARTICIPATION_CHALLENGES,
  PREPARATION_METHODS,
  PRIORITIES,
  SCIENTIFIC_ACTIVITY_TYPES,
  YES_NO_NOT,
} from "@/config/staff";
import { TECHNICAL_FIELDS } from "@/config/survey";
import type { StaffDictionary } from "@/i18n/staff";
import { PATHWAY_STEPS, emptyOpportunity, emptyRecommendation, pathwayBase, pathwaySubmit, showOpportunities, type PathwayValues } from "@/lib/staff-schema";
import { AttachmentField } from "./AttachmentField";
import { FieldGrid, When, Wide, labelOf, labelsOf, opts } from "./form-helpers";
import { Repeater } from "./Repeater";
import { StaffSurvey, type ReviewRow } from "./StaffSurvey";

interface Props {
  t: StaffDictionary;
  values: PathwayValues;
  pathwayOptions: { value: string; label: string }[];
  fieldLabels: Record<string, string>;
}

const hasOther = (v: string[]) => Array.isArray(v) && v.includes("OTHER");

export function PathwayForm({ t, values, pathwayOptions, fieldLabels }: Props) {
  const p = t.pathway;
  const o = t.options;
  const fieldOptions = TECHNICAL_FIELDS.map((f) => ({ value: f, label: fieldLabels[f] }));

  const renderStep = (step: number) => {
    switch (step) {
      case 0:
        return (
          <>
            <ChoiceField multiple searchable name="pathways" number={1} label={p.q1} hint={p.q1Hint} options={pathwayOptions} />
            <TextField multiline name="competencies" number={2} label={p.q2} hint={p.q2Hint} />
            <ChoiceField multiple name="activityTypes" number={3} label={p.q3} options={opts(SCIENTIFIC_ACTIVITY_TYPES, o.activityTypes)} />
            <When name="activityTypes" test={hasOther}>
              <TextField name="activityTypesOther" label={p.otherSpecify} compact />
            </When>
          </>
        );
      case 1:
        return (
          <>
            <ChoiceField name="knowsCompetitions" number={4} label={p.q4} columns={3} options={opts(YES_NO_NOT, o.yesNoNot)} />
            <When name="knowsCompetitions" test={(v: string) => showOpportunities({ knowsCompetitions: v })}>
              <Repeater
                name="opportunities"
                t={t}
                label={p.opportunities}
                hint={p.opportunitiesHint}
                itemLabel={p.opportunity}
                addLabel={p.addOpportunity}
                addAnotherLabel={p.addAnotherOpportunity}
                titleField="name"
                newItem={emptyOpportunity}
                renderItem={(i) => {
                  const n = (k: string) => `opportunities.${i}.${k}`;
                  return (
                    <FieldGrid>
                      <TextField compact name={n("name")} label={p.o.name} />
                      <ChoiceField compact name={n("type")} label={p.o.type} columns={2} options={opts(OPPORTUNITY_TYPES, o.opportunityTypes)} />
                      <TextField compact required={false} name={n("organiser")} label={p.o.organiser} />
                      <TextField compact required={false} name={n("location")} label={p.o.location} />
                      <Wide>
                        <TextField compact required={false} type="url" dir="ltr" name={n("url")} label={p.o.url} placeholder="https://" />
                      </Wide>
                      <TextField compact required={false} type="date" name={n("expectedDate")} label={p.o.expectedDate} hint={t.common.unknownAllowed} />
                      <TextField compact required={false} type="date" name={n("registrationDeadline")} label={p.o.deadline} hint={t.common.unknownAllowed} />
                      <Wide>
                        <ChoiceField compact multiple required={false} name={n("targetLevels")} label={p.o.levels} exclusive={ALL_LEVELS} columns={3} options={opts(LEVEL_OPTIONS, o.levels)} />
                      </Wide>
                      <ChoiceField compact required={false} name={n("participation")} label={p.o.participation} options={opts(PARTICIPATION, o.participation)} />
                      <TextField compact required={false} type="number" name={n("teamSize")} label={p.o.teamSize} />
                      <Wide>
                        <ChoiceField compact multiple required={false} name={n("requiredFields")} label={p.o.requiredFields} hint={p.o.requiredFieldsHint} columns={2} options={fieldOptions} />
                      </Wide>
                      <TextField compact multiline rows={2} required={false} name={n("requiredSkills")} label={p.o.requiredSkills} />
                      <TextField compact multiline rows={2} required={false} name={n("eligibility")} label={p.o.eligibility} />
                      <TextField compact multiline rows={2} required={false} name={n("preparation")} label={p.o.preparation} />
                      <TextField compact multiline rows={2} required={false} name={n("equipment")} label={p.o.equipment} />
                      <TextField compact multiline rows={2} required={false} name={n("notes")} label={p.o.notes} />
                      <Wide>
                        <ChoiceField compact name={n("priority")} label={p.o.priority} columns={3} options={opts(PRIORITIES, o.priority)} />
                      </Wide>
                      <Wide>
                        <AttachmentField name={n("attachments")} t={t} />
                      </Wide>
                    </FieldGrid>
                  );
                }}
              />
            </When>
          </>
        );
      default:
        return (
          <>
            <ChoiceField multiple name="preparationMethods" number={5} label={p.q8} options={opts(PREPARATION_METHODS, o.preparationMethods)} />
            <When name="preparationMethods" test={hasOther}>
              <TextField name="preparationMethodsOther" label={p.otherSpecify} compact />
            </When>
            <ChoiceField multiple name="challenges" number={6} label={p.q9} options={opts(PARTICIPATION_CHALLENGES, o.challenges)} />
            <When name="challenges" test={hasOther}>
              <TextField name="challengesOther" label={p.otherSpecify} compact />
            </When>
            <ChoiceField multiple required={false} name="supportNeeded" number={7} label={p.q11} options={opts(DEPARTMENT_SUPPORT, o.deptSupport)} />
            <TextField multiline rows={2} required={false} name="supportDetails" label={p.q11Details} compact />
            <TextField multiline rows={3} required={false} name="partners" number={8} label={p.q10} />
            <Repeater
              name="recommendations"
              t={t}
              label={`9. ${p.q12}`}
              itemLabel={p.recommendation}
              addLabel={p.addRecommendation}
              addAnotherLabel={p.addRecommendation}
              titleField="name"
              max={3}
              newItem={emptyRecommendation}
              renderItem={(i) => {
                const n = (k: string) => `recommendations.${i}.${k}`;
                return (
                  <FieldGrid>
                    <Wide>
                      <TextField compact name={n("name")} label={p.r.name} />
                    </Wide>
                    <Wide>
                      <TextField compact multiline rows={2} required={false} name={n("description")} label={`${p.r.description} / ${p.r.benefit}`} />
                    </Wide>
                    <Wide>
                      <ChoiceField compact name={n("priority")} label={p.r.priority} columns={3} options={opts(PRIORITIES, o.priority)} />
                    </Wide>
                    <TextField compact required={false} name={n("period")} label={p.r.period} />
                  </FieldGrid>
                );
              }}
            />
          </>
        );
    }
  };

  const review = (v: PathwayValues): ReviewRow[][] => {
    const pathwayLabel = (c: string) => pathwayOptions.find((x) => x.value === c)?.label ?? c;
    const withOther = (vals: string[], labels: Record<string, string>, other: string) =>
      labelsOf(vals, labels).map((l, i) => (vals[i] === "OTHER" && other ? `${l}: ${other}` : l));
    return [
      [
        { label: p.q1, value: v.pathways.map(pathwayLabel) },
        { label: p.q2, value: v.competencies },
        { label: p.q3, value: withOther(v.activityTypes, o.activityTypes, v.activityTypesOther) },
      ],
      [
        { label: p.q4, value: labelOf(v.knowsCompetitions, o.yesNoNot) },
        ...(showOpportunities(v)
          ? [
              {
                label: p.opportunities,
                value: v.opportunities.map(
                  (x) => `${x.name || t.common.untitled} — ${labelOf(x.type, o.opportunityTypes)} · ${labelOf(x.priority, o.priority)}${x.attachments?.length ? ` · ${t.attachments.label}: ${x.attachments.length}` : ""}`,
                ),
              },
            ]
          : []),
      ],
      [
        { label: p.q8, value: withOther(v.preparationMethods, o.preparationMethods, v.preparationMethodsOther) },
        { label: p.q9, value: withOther(v.challenges, o.challenges, v.challengesOther) },
        { label: p.q11, value: [...labelsOf(v.supportNeeded, o.deptSupport), ...(v.supportDetails ? [v.supportDetails] : [])] },
        { label: p.q10, value: v.partners },
        { label: p.q12, value: v.recommendations.map((r) => `${r.name || t.common.untitled} · ${labelOf(r.priority, o.priority)}${r.period ? ` · ${r.period}` : ""}`) },
      ],
    ];
  };

  return (
    <StaffSurvey
      kind="pathway"
      t={t}
      title={p.title}
      steps={[p.steps[0], p.steps[1], { title: `${p.steps[2].title} · ${p.steps[3].title}`, description: p.steps[3].description }]}
      stepFields={PATHWAY_STEPS as string[][]}
      repeaters={["opportunities", "recommendations"]}
      schema={pathwaySubmit}
      defaultValues={values}
      normalize={(v) => {
        const r = pathwayBase.safeParse(v);
        return r.success ? r.data : null;
      }}
      renderStep={renderStep}
      review={review}
    />
  );
}
