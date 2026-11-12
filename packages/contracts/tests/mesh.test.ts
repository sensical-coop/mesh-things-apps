import { describe, expect, it } from "vitest";
import { meshCreateBody } from "../src/mesh";

const values = { label: null, channel_id: "LongFast", psk_b64: "AQ==" };

describe("meshCreateBody", () => {
  it("sends the terms only when there is an acceptance", () => {
    expect(meshCreateBody(values, { discover_gateways: false })).toEqual({
      data: { ...values, discover_gateways: false, terms_locale: "en" },
    });
    const withTerms = meshCreateBody(values, { discover_gateways: true, terms: { version: "3", locale: "es" } });
    expect(withTerms).toEqual({
      data: { ...values, discover_gateways: true, terms_version: "3", terms_locale: "es" },
    });
  });

  it("returns the field errors of an invalid body", () => {
    expect(meshCreateBody({ ...values, channel_id: "x".repeat(256) }, { discover_gateways: false })).toEqual({
      errors: { channel_id: expect.any(String) },
    });
  });
});
