import { ContributionForm } from "@/components/staff/ContributionForm";
import { ModuleForm } from "@/components/staff/ModuleForm";
import { PathwayForm } from "@/components/staff/PathwayForm";
import { StaffShell } from "@/components/staff/StaffShell";
import { SPECIALISATIONS } from "@/config/survey";
import ar from "@/i18n/ar";
import en from "@/i18n/en";
import { getStaffI18n } from "@/lib/staff-i18n";
import { emptyContribution, emptyModule, emptyPathway } from "@/lib/staff-schema";

export type SurveyKind = "pathway" | "module" | "contribution";

/** Open staff form (no account needed), like the student survey. */
export async function SurveyPage({ kind }: { kind: SurveyKind }) {
  const i18n = await getStaffI18n();
  const { t, locale } = i18n;
  const fieldLabels = (locale === "ar" ? ar : en).options.fields as Record<string, string>;
  const pathwayOptions = SPECIALISATIONS.map((s) => ({ value: s.value, label: i18n.pathway(s.value) }));

  return (
    <StaffShell i18n={i18n} back wide>
      {kind === "pathway" ? (
        <PathwayForm t={t} values={emptyPathway()} pathwayOptions={pathwayOptions} fieldLabels={fieldLabels} />
      ) : kind === "module" ? (
        <ModuleForm t={t} values={emptyModule()} />
      ) : (
        <ContributionForm t={t} values={emptyContribution()} fieldLabels={fieldLabels} />
      )}
    </StaffShell>
  );
}
