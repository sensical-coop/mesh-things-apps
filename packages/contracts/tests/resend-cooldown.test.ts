import { describe, expect, it } from "vitest";
import { RESEND_COOLDOWN_SECONDS, secondsUntilResendAllowed } from "../src/resend-cooldown";

describe("resend-cooldown", () => {
  it("has no cooldown before any email has been sent", () => {
    expect(secondsUntilResendAllowed(null, Date.now())).toBe(0);
  });

  it("counts down from the cooldown window and clamps at zero", () => {
    const sentAt = new Date("2026-01-01T00:00:00.000Z").toISOString();
    const now = Date.parse(sentAt) + 10_000;
    expect(secondsUntilResendAllowed(sentAt, now)).toBe(RESEND_COOLDOWN_SECONDS - 10);
    expect(secondsUntilResendAllowed(sentAt, Date.parse(sentAt) + RESEND_COOLDOWN_SECONDS * 1000)).toBe(0);
    expect(secondsUntilResendAllowed(sentAt, Date.parse(sentAt) + (RESEND_COOLDOWN_SECONDS + 30) * 1000)).toBe(0);
  });
});
