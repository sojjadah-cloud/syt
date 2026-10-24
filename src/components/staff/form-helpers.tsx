"use client";

import { useWatch } from "react-hook-form";

/** Renders children only when the watched value passes the test (conditional questions). */
export function When({ name, test, children }: { name: string | string[]; test: (v: never) => boolean; children: React.ReactNode }) {
  const v = useWatch({ name: name as string });
  return test(v as never) ? <>{children}</> : null;
}

export const opts = <K extends string>(keys: readonly K[], labels: Record<K, string>) => keys.map((value) => ({ value, label: labels[value] }));

export const labelsOf = <K extends string>(values: readonly string[], labels: Record<K, string>) =>
  values.map((v) => labels[v as K] ?? v);

export const labelOf = <K extends string>(value: string, labels: Record<K, string>) => (value ? (labels[value as K] ?? value) : "");

/** Two-column grid for the many short fields inside one repeated entry. */
export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

export function Wide({ children }: { children: React.ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}
