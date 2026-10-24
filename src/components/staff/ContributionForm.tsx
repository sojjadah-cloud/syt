"use client";

import { ChoiceField, TextField } from "@/components/survey/fields";
import {
  ALL_LEVELS,
  AVAILABILITY,
  COLLABORATION,
  CONTRIBUTION_TYPES,
  DELIVERY_PREFERENCES,
  EXPERTISE_AREAS,
  LEVEL_OPTIONS,
  MENTOR_WILLINGNESS,
  PREFERRED_DURATIONS,
  SUPERVISE_EXTERNAL,
  SUPPORT_AREAS,
  WORKSHOP_FORMATS,
  YES_POSSIBLY_NOT,
} from "@/config/staff";
import { TECHNICAL_FIELDS } from "@/config/survey";
import type { StaffDictionary } from "@/i18n/staff";
import {
  CONTRIBUTION_STEPS,
  contributionSubmit,
  emptyProject,
  emptyWorkshop,
  showMentorFields,
  showProjects,
  showWorkshops,
  type ContributionValues,
} from "@/lib/staff-schema";
import { FieldGrid, When, Wide, labelOf, labelsOf, opts } from "./form-helpers";
import { Repeater } from "./Repeater";
import { StaffSurvey, type ReviewRow } from "./StaffSurvey";

interface Props {
  t: StaffDictionary;
  values: ContributionValues;
  fieldLabels: Record<string, string>;
  pathwayOptions: { value: string; label: string }[];
}

export function ContributionForm({ t, values, fieldLabels, pathwayOptions }: Props) {
  const c = t.contribution;
  const o = t.options;
  const expertiseOpts = opts(EXPERTISE_AREAS, o.expertise);
  const hasOther = (v: string[]) => Array.isArray(v) && v.includes("OTHER");

  const renderStep = (step: number) => {
    switch (step) {
      case 0:
        return (
          <>
            <ChoiceField multiple name="expertise" number={1} label={c.q1} columns={3} options={expertiseOpts} />
            <When name="expertise" test={hasOther}>
              <TextField compact name="expertiseOther" label={t.pathway.otherSpecify} />
            </When>
            <ChoiceField multiple name="supportAreas" number={2} label={c.q2} options={opts(SUPPORT_AREAS, o.supportAreas)} />
            <When name="supportAreas" test={hasOther}>
              <TextField compact name="supportAreasOther" label={t.pathway.otherSpecify} />
            </When>
          </>
        );
      case 1:
        return (
          <>
            <ChoiceField name="workshopIntent" number={3} label={c.q3} columns={3} options={opts(YES_POSSIBLY_NOT, o.yesPossiblyNot)} />
            <When name="workshopIntent" test={(v: string) => showWorkshops({ workshopIntent: v })}>
              <Repeater
                name="workshops"
                t={t}
                label={c.workshop}
                itemLabel={c.workshop}
                addLabel={c.addWorkshop}
                addAnotherLabel={c.addAnotherWorkshop}
                titleField="title"
                newItem={emptyWorkshop}
                renderItem={(i) => {
                  const n = (k: string) => `workshops.${i}.${k}`;
                  return (
                    <FieldGrid>
                      <Wide>
                        <TextField compact name={n("title")} label={c.w.title} />
                      </Wide>
                      <Wide>
                        <ChoiceField compact name={n("field")} label={c.w.field} columns={3} options={expertiseOpts} />
                      </Wide>
                      <TextField compact multiline rows={2} name={n("description")} label={c.w.description} />
                      <TextField compact multiline rows={2} required={false} name={n("objectives")} label={c.w.objectives} />
                      <Wide>
                        <ChoiceField compact multiple required={false} name={n("levels")} label={c.w.levels} exclusive={ALL_LEVELS} columns={3} options={opts(LEVEL_OPTIONS, o.levels)} />
                      </Wide>
                      <TextField compact required={false} name={n("prerequisites")} label={c.w.prerequisites} />
                      <TextField compact required={false} type="number" name={n("maxParticipants")} label={c.w.maxParticipants} />
                      <ChoiceField compact required={false} name={n("format")} label={c.w.format} options={opts(WORKSHOP_FORMATS, o.workshopFormat)} />
                      <div className="space-y-5">
                        <TextField compact required={false} name={n("duration")} label={c.w.duration} />
                        <TextField compact required={false} name={n("period")} label={c.w.period} />
                      </div>
                      <TextField compact required={false} name={n("equipment")} label={c.w.equipment} />
                      <TextField compact required={false} name={n("venue")} label={c.w.venue} />
                      <Wide>
                        <TextField compact multiline rows={2} required={false} name={n("expectedOutcomes")} label={c.w.outcomes} />
                      </Wide>
                    </FieldGrid>
                  );
                }}
              />
            </When>
            <ChoiceField name="projectIntent" number={4} label={c.q4} columns={3} options={opts(YES_POSSIBLY_NOT, o.yesPossiblyNot)} />
            <When name="projectIntent" test={(v: string) => showProjects({ projectIntent: v })}>
              <Repeater
                name="projects"
                t={t}
                label={c.project}
                itemLabel={c.project}
                addLabel={c.addProject}
                addAnotherLabel={c.addAnotherProject}
                titleField="title"
                newItem={emptyProject}
                renderItem={(i) => {
                  const n = (k: string) => `projects.${i}.${k}`;
                  return (
                    <FieldGrid>
                      <Wide>
                        <TextField compact name={n("title")} label={c.p.title} />
                      </Wide>
                      <Wide>
                        <ChoiceField compact name={n("field")} label={c.p.field} columns={3} options={expertiseOpts} />
                      </Wide>
                      <TextField compact multiline rows={2} name={n("problem")} label={c.p.problem} />
                      <TextField compact multiline rows={2} required={false} name={n("description")} label={c.p.description} />
                      <TextField compact multiline rows={2} required={false} name={n("expectedOutcomes")} label={c.p.outcomes} />
                      <TextField compact multiline rows={2} required={false} name={n("resources")} label={c.p.resources} />
                      <Wide>
                        <ChoiceField
                          compact
                          multiple
                          required={false}
                          name={n("requiredFields")}
                          label={c.p.requiredFields}
                          hint={t.pathway.o.requiredFieldsHint}
                          columns={2}
                          options={TECHNICAL_FIELDS.map((f) => ({ value: f, label: fieldLabels[f] }))}
                        />
                      </Wide>
                      <Wide>
                        <TextField compact required={false} name={n("requiredSkills")} label={c.p.requiredSkills} />
                      </Wide>
                      <Wide>
                        <ChoiceField compact multiple required={false} name={n("levels")} label={c.p.levels} exclusive={ALL_LEVELS} columns={3} options={opts(LEVEL_OPTIONS, o.levels)} />
                      </Wide>
                      <TextField compact required={false} type="number" name={n("studentCount")} label={c.p.studentCount} />
                      <TextField compact required={false} name={n("duration")} label={c.p.duration} />
                      <ChoiceField compact required={false} name={n("contributionType")} label={c.p.contributionType} options={opts(CONTRIBUTION_TYPES, o.contributionType)} />
                      <div className="space-y-5">
                        <TextField compact multiline rows={2} required={false} name={n("publicationOptions")} label={c.p.publication} />
                        <TextField compact multiline rows={2} required={false} name={n("collaboration")} label={c.p.collaboration} />
                      </div>
                    </FieldGrid>
                  );
                }}
              />
            </When>
            <ChoiceField name="mentorCompetitions" number={5} label={c.q5} columns={3} options={opts(MENTOR_WILLINGNESS, o.mentor)} />
            <When name="mentorCompetitions" test={(v: string) => showMentorFields({ mentorCompetitions: v })}>
              <ChoiceField compact multiple name="mentorFields" label={c.q5Fields} columns={3} options={expertiseOpts.filter((x) => x.value !== "OTHER")} />
            </When>
          </>
        );
      case 2:
        return (
          <>
            <ChoiceField multiple name="deliveryPreferences" number={6} label={c.q6} options={opts(DELIVERY_PREFERENCES, o.delivery)} />
            <ChoiceField multiple name="levels" number={7} label={c.q7} exclusive={ALL_LEVELS} columns={3} options={opts(LEVEL_OPTIONS, o.levels)} />
            <ChoiceField name="duration" number={8} label={c.q8} columns={3} options={opts(PREFERRED_DURATIONS, o.duration)} />
            <ChoiceField multiple name="availability" number={9} label={c.q9} options={opts(AVAILABILITY, o.availability)} />
            <TextField compact required={false} name="availabilityNote" label={c.q9Note} />
            <ChoiceField name="collaboration" number={10} label={c.q10} options={opts(COLLABORATION, o.collaboration)} />
          </>
        );
      default:
        return (
          <>
            <TextField multiline required={false} name="resourcesNeeded" number={11} label={c.q11} />
            <ChoiceField name="superviseExternal" number={12} label={c.q12} options={opts(SUPERVISE_EXTERNAL, o.superviseExternal)} />
            <TextField multiline required={false} name="recommendations" number={13} label={c.q13} />
          </>
        );
    }
  };

  const review = (v: ContributionValues): ReviewRow[][] => {
    const withOther = (vals: string[], labels: Record<string, string>, other: string) =>
      labelsOf(vals, labels).map((l, i) => (vals[i] === "OTHER" && other ? `${l}: ${other}` : l));
    return [
      [
        { label: c.q1, value: withOther(v.expertise, o.expertise, v.expertiseOther) },
        { label: c.q2, value: withOther(v.supportAreas, o.supportAreas, v.supportAreasOther) },
      ],
      [
        { label: c.q3, value: labelOf(v.workshopIntent, o.yesPossiblyNot) },
        ...(showWorkshops(v) ? [{ label: c.workshop, value: v.workshops.map((w) => `${w.title || t.common.untitled} — ${labelOf(w.field, o.expertise)}`) }] : []),
        { label: c.q4, value: labelOf(v.projectIntent, o.yesPossiblyNot) },
        ...(showProjects(v) ? [{ label: c.project, value: v.projects.map((p) => `${p.title || t.common.untitled} — ${labelOf(p.field, o.expertise)}`) }] : []),
        { label: c.q5, value: [labelOf(v.mentorCompetitions, o.mentor), ...(showMentorFields(v) ? labelsOf(v.mentorFields, o.expertise) : [])].filter(Boolean) },
      ],
      [
        { label: c.q6, value: labelsOf(v.deliveryPreferences, o.delivery) },
        { label: c.q7, value: labelsOf(v.levels, o.levels) },
        { label: c.q8, value: labelOf(v.duration, o.duration) },
        { label: c.q9, value: [...labelsOf(v.availability, o.availability), ...(v.availabilityNote ? [v.availabilityNote] : [])] },
        { label: c.q10, value: labelOf(v.collaboration, o.collaboration) },
      ],
      [
        { label: c.q11, value: v.resourcesNeeded },
        { label: c.q12, value: labelOf(v.superviseExternal, o.superviseExternal) },
        { label: c.q13, value: v.recommendations },
      ],
    ];
  };

  return (
    <StaffSurvey
      kind="contribution"
      t={t}
      title={c.title}
      steps={c.steps}
      stepFields={CONTRIBUTION_STEPS as string[][]}
      repeaters={["workshops", "projects"]}
      schema={contributionSubmit}
      defaultValues={values}
      renderStep={renderStep}
      review={review}
      pathwayOptions={pathwayOptions}
    />
  );
}
