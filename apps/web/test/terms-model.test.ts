import assert from "node:assert/strict";
import test from "node:test";
import { allStatementsAccepted, termsLocale, termsStanding } from "../src/features/terms/model.ts";

test("every statement the API sent must be accepted, not just some", () => {
  const ids = ["controller", "authority", "sensitive"];
  assert.equal(allStatementsAccepted(ids, new Set()), false);
  assert.equal(allStatementsAccepted(ids, new Set(["controller", "authority"])), false);
  assert.equal(allStatementsAccepted(ids, new Set(ids)), true);
  assert.equal(allStatementsAccepted([], new Set(["controller"])), false);
});

test("terms come in English unless the console is in Spanish", () => {
  assert.equal(termsLocale("es"), "es");
  assert.equal(termsLocale("es-ES"), "es");
  assert.equal(termsLocale("en-GB"), "en");
  assert.equal(termsLocale("ca"), "en");
});

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

test("termsEnforcedFrom: only a 404 turns terms off; anything unknown counts as on", async () => {
  const { termsEnforcedFrom } = await import("../src/features/terms/model.ts");
  assert.equal(termsEnforcedFrom({ loaded: true, errorStatus: undefined }), true);
  assert.equal(termsEnforcedFrom({ loaded: false, errorStatus: 404 }), false);
  // Still loading, a server error, or no connection: unknown, and callers keep asking for terms.
  assert.equal(termsEnforcedFrom({ loaded: false, errorStatus: undefined }), undefined);
  assert.equal(termsEnforcedFrom({ loaded: false, errorStatus: 500 }), undefined);
  assert.equal(termsEnforcedFrom({ loaded: false, errorStatus: 401 }), undefined);
});
