import { describe, expect, it } from "vitest";
import { isSilent } from "../../src/shared/silence";

const t0 = Date.parse("2026-01-01T00:00:00.000Z");

describe("isSilent", () => {
  it("never seen is silent", () => {
    expect(isSilent(null, 300, t0)).toBe(true);
  });

  it("within three intervals is live", () => {
    expect(isSilent("2026-01-01T00:00:00.000Z", 300, t0 + 600_000)).toBe(false);
  });

  it("past three intervals is silent", () => {
    expect(isSilent("2026-01-01T00:00:00.000Z", 300, t0 + 901_000)).toBe(true);
  });
});
