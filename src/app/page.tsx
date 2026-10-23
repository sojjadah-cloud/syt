import { SurveyApp } from "@/components/survey/SurveyApp";
import { I18nProvider } from "@/i18n/context";

export default function SurveyPage() {
  return (
    <I18nProvider>
      <SurveyApp />
    </I18nProvider>
  );
}
