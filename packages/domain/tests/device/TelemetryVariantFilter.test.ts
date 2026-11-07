import { describe, expect, it } from "vitest";
import { matchesTelemetryVariantFilter } from "../../src/device/TelemetryVariantFilter";

const ENV = "77777777-7777-4777-8777-777777777777";
const AIR = "56565656-5656-4565-8565-565656565656";

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
