import { describe, expect, it } from "vitest";
import {
  matchesTelemetryVariantFilter,
  parseTelemetryVariantFilter,
} from "../../src/device/TelemetryVariantFilter";

const ENV = "77777777-7777-4777-8777-777777777777";
const AIR = "56565656-5656-4565-8565-565656565656";

describe("parseTelemetryVariantFilter", () => {
  it("reads the operator and ids, with bare ids as has_any_of", () => {
    expect(parseTelemetryVariantFilter(ENV)).toEqual({ operator: "has_any_of", ids: [ENV] });
    expect(parseTelemetryVariantFilter(`has_all_of:${ENV}|${AIR}`)).toEqual({ operator: "has_all_of", ids: [ENV, AIR] });
  });

  it("rejects unknown operators, missing ids and non-uuids", () => {
    expect(parseTelemetryVariantFilter(`has_some_of:${ENV}`)).toBeNull();
    expect(parseTelemetryVariantFilter("has_any_of:")).toBeNull();
    expect(parseTelemetryVariantFilter("has_any_of:not-a-uuid")).toBeNull();
  });
});

describe("matchesTelemetryVariantFilter", () => {
  const both = [ENV, AIR];
  const envOnly = [ENV];
  const none: string[] = [];

  it("matches any, all or none of the ids", () => {
    const any = { operator: "has_any_of" as const, ids: [AIR] };
    const all = { operator: "has_all_of" as const, ids: [ENV, AIR] };
    const noneOf = { operator: "has_none_of" as const, ids: [ENV] };
    expect([both, envOnly, none].map((ids) => matchesTelemetryVariantFilter(ids, any))).toEqual([true, false, false]);
    expect([both, envOnly, none].map((ids) => matchesTelemetryVariantFilter(ids, all))).toEqual([true, false, false]);
    expect([both, envOnly, none].map((ids) => matchesTelemetryVariantFilter(ids, noneOf))).toEqual([false, false, true]);
  });
});
