import assert from "node:assert/strict";
import test from "node:test";
import { RESEND_COOLDOWN_SECONDS, secondsUntilResendAllowed } from "../src/pages/verify-pending/resend-cooldown.ts";

test("no cooldown before any email has been sent", () => {
  assert.equal(secondsUntilResendAllowed(null, Date.now()), 0);
});

test("counts down from the cooldown window and clamps at zero", () => {
  const sentAt = new Date("2026-01-01T00:00:00.000Z").toISOString();
  const now = Date.parse(sentAt) + 10_000;
  assert.equal(secondsUntilResendAllowed(sentAt, now), RESEND_COOLDOWN_SECONDS - 10);
  assert.equal(secondsUntilResendAllowed(sentAt, Date.parse(sentAt) + RESEND_COOLDOWN_SECONDS * 1000), 0);
  assert.equal(secondsUntilResendAllowed(sentAt, Date.parse(sentAt) + (RESEND_COOLDOWN_SECONDS + 30) * 1000), 0);
});
