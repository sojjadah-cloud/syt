import { describe, expect, it } from "vitest";
import { isSameOrigin } from "@/lib/same-origin";

const h = (o: Record<string, string>) => new Headers(o);

describe("isSameOrigin", () => {
  it("accepts a browser request behind a proxy (Render)", () => {
    expect(
      isSameOrigin(h({ origin: "https://mtc-se-survey.onrender.com", host: "localhost:10000", "x-forwarded-host": "mtc-se-survey.onrender.com" })),
    ).toBe(true);
    expect(isSameOrigin(h({ origin: "https://mtc-se-survey.onrender.com", host: "mtc-se-survey.onrender.com" }))).toBe(true);
  });

  it("accepts local development and non-browser clients", () => {
    expect(isSameOrigin(h({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
    expect(isSameOrigin(h({ host: "localhost:3000" }))).toBe(true);
  });

  it("rejects other sites and malformed origins", () => {
    expect(isSameOrigin(h({ origin: "https://evil.example", host: "mtc-se-survey.onrender.com" }))).toBe(false);
    expect(isSameOrigin(h({ origin: "null", host: "mtc-se-survey.onrender.com" }))).toBe(false);
  });
});
