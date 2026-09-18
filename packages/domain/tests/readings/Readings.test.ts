import { describe, expect, it } from "vitest";
import type { LatestReading } from "../../src/readings/Readings";

function emptyLatest(): LatestReading[] {
  return [];
}

describe("readings", () => {
  it("empty latest is a list not a failure", () => {
    expect(emptyLatest()).toEqual([]);
  });

  it("a point has time and value", () => {
    const reading: LatestReading = {
      payloadKind: "environmentmetrics",
      fieldName: "temperature",
      channel: "environmentmetrics.temperature",
      value: 21.5,
      time: "2026-01-01T00:00:00.000Z",
      unit: "Cel",
      quantityKind: "physical_property",
      vocabularyUri: "https://example.test/temp",
      origin: "device",
    };
    expect(reading.value).toBe(21.5);
  });
});
