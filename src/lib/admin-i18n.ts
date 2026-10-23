import "server-only";
import { cookies } from "next/headers";
import { SPECIALISATIONS, type IseTrack, type TechnicalField } from "@/config/survey";
import { ADMIN_DICTS, ADMIN_LOCALE_COOKIE } from "@/i18n/admin";
import ar from "@/i18n/ar";
import en from "@/i18n/en";
import { format } from "@/i18n/format";

export type AdminLocale = "en" | "ar";

function build(locale: AdminLocale) {
  const o = (locale === "ar" ? ar : en).options;
  const dateLocale = locale === "ar" ? "ar-OM-u-nu-latn" : "en-GB";
  return {
    locale,
    dir: (locale === "ar" ? "rtl" : "ltr") as "rtl" | "ltr",
    t: ADMIN_DICTS[locale],
    o,
    format,
    spec: (v: string) => {
      const s = SPECIALISATIONS.find((x) => x.value === v);
      return s ? (locale === "ar" ? s.ar : s.en) : v;
    },
    track: (s: { iseTrack: IseTrack | null; iseTrackOther: string | null }) =>
      s.iseTrack ? (s.iseTrack === "OTHER" && s.iseTrackOther ? `${o.iseTrack.OTHER}: ${s.iseTrackOther}` : o.iseTrack[s.iseTrack]) : "",
    field: (f: { field: TechnicalField; otherText: string | null }) =>
      f.field === "OTHER" && f.otherText ? `${o.fields.OTHER}: ${f.otherText}` : o.fields[f.field],
    date: (d: Date) => d.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" }),
    dateTime: (d: Date) => d.toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" }),
  };
}

export type AdminI18n = ReturnType<typeof build>;

export async function getAdminI18n(): Promise<AdminI18n> {
  const v = (await cookies()).get(ADMIN_LOCALE_COOKIE)?.value;
  return build(v === "ar" ? "ar" : "en");
}

export const specWithTrack = (i: AdminI18n, s: { specialisation: string; iseTrack: IseTrack | null; iseTrackOther: string | null }) =>
  [i.spec(s.specialisation), i.track(s)].filter(Boolean).join(" — ");
