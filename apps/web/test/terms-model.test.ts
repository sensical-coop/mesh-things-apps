import assert from "node:assert/strict";
import test from "node:test";
import { termsStanding } from "../src/features/terms/model.ts";

const now = new Date("2026-09-26T00:00:00Z");
const base = { acceptedVersion: "platform-2026-09", expiresAt: null, pausedAt: null, currentVersion: "platform-2026-09", now };

test("termsStanding: paused or past expiry is lapsed, whatever else", () => {
  assert.equal(termsStanding({ ...base, pausedAt: "2026-09-20T00:00:00Z" }), "lapsed");
  assert.equal(termsStanding({ ...base, expiresAt: "2026-09-25T00:00:00Z" }), "lapsed");
});

test("termsStanding: no acceptance, an older version, or close to lapsing", () => {
  assert.equal(termsStanding({ ...base, acceptedVersion: null }), "none");
  assert.equal(termsStanding({ ...base, currentVersion: "platform-2027-01" }), "outdated");
  assert.equal(termsStanding({ ...base, expiresAt: "2026-10-10T00:00:00Z" }), "expiring");
  assert.equal(termsStanding({ ...base, expiresAt: "2027-09-26T00:00:00Z" }), "ok");
  assert.equal(termsStanding(base), "ok");
});
