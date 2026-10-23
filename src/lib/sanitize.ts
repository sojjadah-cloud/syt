// Control characters other than tab/newline, plus zero-width and bidi-override characters.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;

/** Normalises free text before validation and storage. Output is always rendered escaped by React. */
export function sanitizeText(input: unknown, multiline = false): string {
  if (typeof input !== "string") return "";
  let s = input.normalize("NFC").replace(CONTROL, "");
  if (multiline) {
    s = s
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
  } else {
    s = s.replace(/\s+/g, " ");
  }
  return s.trim();
}

/** Prevents spreadsheet formula injection when exporting user-provided text. */
export function csvSafe(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}
