import { describe, expect, it } from "vitest";
import { allStatementsAccepted, signupCreateBody, signupTermsStale, termsEnforcedFrom, termsLocale } from "../src/terms";

describe("terms", () => {
  it("requires every statement the API sent, not just some", () => {
    const ids = ["controller", "authority", "sensitive"];
    expect(allStatementsAccepted(ids, new Set())).toBe(false);
    expect(allStatementsAccepted(ids, new Set(["controller", "authority"]))).toBe(false);
    expect(allStatementsAccepted(ids, new Set(ids))).toBe(true);
    expect(allStatementsAccepted([], new Set(["controller"]))).toBe(false);
  });

  it("serves terms in English unless the console is in Spanish", () => {
    expect(termsLocale("es")).toBe("es");
    expect(termsLocale("es-ES")).toBe("es");
    expect(termsLocale("en-GB")).toBe("en");
    expect(termsLocale("ca")).toBe("en");
  });

  it("builds a signup body only after enforced terms are accepted", () => {
    const values = { name: "Ada", email: "ada@example.com", password: "secret", accepted: ["keep"] };
    const current = { version: "3", locale: "es-ES", statements: [{ id: "keep" }] };
    expect(signupCreateBody(values, { off: false, current: undefined })).toBeNull();
    expect(signupCreateBody(values, { off: false, current: { ...current, statements: [{ id: "keep" }, { id: "share" }] } })).toBeNull();
    expect(signupCreateBody(values, { off: false, current })).toEqual({
      name: "Ada",
      email: "ada@example.com",
      password: "secret",
      terms_version: "3",
      terms_locale: "es",
    });
    expect(signupCreateBody(values, { off: true, current: undefined }, "/start")).toEqual({
      name: "Ada",
      email: "ada@example.com",
      password: "secret",
      next: "/start",
    });
    expect(signupCreateBody({ ...values, accepted: [] }, { off: false, current: { ...current, statements: [] } })).toBeNull();
    expect(signupTermsStale({ terms_version: ["out of date"] })).toBe(true);
    expect(signupTermsStale({ email: ["taken"] })).toBe(false);
  });

  it("turns terms off only on a 404; anything unknown counts as on", () => {
    expect(termsEnforcedFrom({ loaded: true, errorStatus: undefined })).toBe(true);
    expect(termsEnforcedFrom({ loaded: false, errorStatus: 404 })).toBe(false);
    expect(termsEnforcedFrom({ loaded: false, errorStatus: undefined })).toBeUndefined();
    expect(termsEnforcedFrom({ loaded: false, errorStatus: 500 })).toBeUndefined();
    expect(termsEnforcedFrom({ loaded: false, errorStatus: 401 })).toBeUndefined();
  });
});
