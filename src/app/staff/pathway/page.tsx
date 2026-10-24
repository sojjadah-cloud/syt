import type { Metadata } from "next";
import { SurveyPage } from "../SurveyPage";

export const metadata: Metadata = { title: "Staff Scientific Engagement | Systems Engineering Department" };
export const dynamic = "force-dynamic";

export default function NewPathwaySurvey() {
  return <SurveyPage kind="pathway" />;
}
