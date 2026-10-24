import "server-only";
import { cookies } from "next/headers";
import { SPECIALISATIONS } from "@/config/survey";
import { ADMIN_LOCALE_COOKIE } from "@/i18n/admin";
import { format } from "@/i18n/format";
import { STAFF_DICTS } from "@/i18n/staff";

export type UiLocale = "en" | "ar";

/** Staff pages share the admin dashboard's language cookie, so one switch applies everywhere. */
export async function getUiLocale(): Promise<UiLocale> {
  return (await cookies()).get(ADMIN_LOCALE_COOKIE)?.value === "ar" ? "ar" : "en";
}

export async function getStaffI18n() {
  const locale = await getUiLocale();
  const dateLocale = locale === "ar" ? "ar-OM-u-nu-latn" : "en-GB";
  return {
    locale,
    dir: (locale === "ar" ? "rtl" : "ltr") as "rtl" | "ltr",
    t: STAFF_DICTS[locale],
    format,
    pathway: (code: string) => {
      const s = SPECIALISATIONS.find((x) => x.value === code);
      return s ? (locale === "ar" ? s.ar : s.en) : code;
    },
    date: (d: Date) => d.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" }),
    dateTime: (d: Date) => d.toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" }),
  };
}

export type StaffI18n = Awaited<ReturnType<typeof getStaffI18n>>;
