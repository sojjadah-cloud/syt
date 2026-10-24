import "server-only";

export type RawParams = Record<string, string | string[] | undefined>;

/** Whitelisted query-string reader for admin filter forms. */
export function params(raw: RawParams) {
  const get = (k: string) => {
    const v = raw[k];
    return typeof v === "string" ? v.trim().slice(0, 100) : "";
  };
  return {
    q: get("q") || undefined,
    one: <T extends readonly string[]>(k: string, list: T): T[number] | undefined => {
      const v = get(k);
      return (list as readonly string[]).includes(v) ? (v as T[number]) : undefined;
    },
    date: (k: string) => {
      const v = get(k);
      return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined;
    },
    raw: get,
    /** Query string of the current filters (for export links). */
    qs: () =>
      new URLSearchParams(Object.entries(raw).flatMap(([k, v]) => (typeof v === "string" && v && k !== "page" ? [[k, v]] : []))).toString(),
  };
}

export const ci = (q: string) => ({ contains: q, mode: "insensitive" as const });
