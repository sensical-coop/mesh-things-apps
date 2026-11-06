import { describe, expect, it } from "vitest";
import { allStatementsAccepted, termsEnforcedFrom, termsLocale } from "../src/terms";

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

  it("turns terms off only on a 404; anything unknown counts as on", () => {
    expect(termsEnforcedFrom({ loaded: true, errorStatus: undefined })).toBe(true);
    expect(termsEnforcedFrom({ loaded: false, errorStatus: 404 })).toBe(false);
    expect(termsEnforcedFrom({ loaded: false, errorStatus: undefined })).toBeUndefined();
    expect(termsEnforcedFrom({ loaded: false, errorStatus: 500 })).toBeUndefined();
    expect(termsEnforcedFrom({ loaded: false, errorStatus: 401 })).toBeUndefined();
  });
});
