import assert from "node:assert/strict";
import test from "node:test";
import { canEditMesh, meshStatus, meshTermsCurrent, meshTermsStanding, meshTitle } from "../src/features/mesh/model.ts";

test("canEditMesh hides writes while the caller is unknown", () => {
  assert.equal(canEditMesh({ owner_id: "ada" }, undefined), false);
});

test("meshTitle falls back to the channel id", () => {
  assert.equal(meshTitle({ label: "  ", channel_id: "LongFast" }), "LongFast");
  assert.equal(meshTitle({ label: "Hill", channel_id: "LongFast" }), "Hill");
});

test("meshTermsStanding is null on a source mesh and when the API hides the fields", () => {
  const now = new Date("2026-09-26T00:00:00Z");
  const own = { source_id: null, terms_accepted_version: "meshes-2026-09", terms_expires_at: "2027-09-26T00:00:00Z", paused_at: null };
  // On a source, the source's terms apply.
  assert.equal(meshTermsStanding({ ...own, source_id: "src" }, "meshes-2026-09", now), null);
  // Someone else's mesh: the API hides the fields.
  assert.equal(meshTermsStanding({ source_id: null }, "meshes-2026-09", now), null);
});

test("meshStatus covers every state the Status column shows", () => {
  const now = new Date("2026-09-26T00:00:00Z");
  const ctx = { termsEnforced: true, currentTermsVersion: "meshes-2026-09", sourceStatus: undefined, now };
  const own = { source_id: null, terms_accepted_version: "meshes-2026-09", terms_expires_at: "2027-09-26T00:00:00Z", paused_at: null };
  const kind = (mesh: object, extra: object = {}) => meshStatus({ ...own, ...mesh }, { ...ctx, ...extra }).kind;

  assert.equal(kind({}), "active");
  assert.equal(kind({ terms_expires_at: "2026-10-10T00:00:00Z" }), "renewSoon");
  assert.equal(kind({ terms_accepted_version: "meshes-2025-01" }), "termsChanged");
  assert.equal(kind({ terms_accepted_version: null }), "termsNotAccepted");
  assert.equal(kind({ paused_at: "2026-09-20T00:00:00Z" }), "scheduledForDeletion");
  // Past expiry counts as lapsed even before the lifecycle pass pauses it.
  assert.equal(kind({ terms_expires_at: "2026-09-25T00:00:00Z" }), "scheduledForDeletion");
  // On a source, the source's state decides.
  assert.equal(kind({ source_id: "s" }, { sourceStatus: "connected" }), "active");
  assert.equal(kind({ source_id: "s" }, { sourceStatus: "paused" }), "sourcePaused");
  assert.equal(kind({ source_id: "s" }, { sourceStatus: "disconnected" }), "sourceDisconnected");
  assert.equal(kind({ source_id: "s" }, { sourceStatus: "unknown" }), "sourceUnknown");
  assert.equal(kind({ source_id: "s" }), "sourceUnknown");
  // A lite instance asks for no terms: nothing to renew or accept.
  assert.equal(kind({ terms_accepted_version: null }, { termsEnforced: false }), "active");
  // Someone else's mesh: the API hides its state.
  assert.equal(meshStatus({ source_id: undefined }, ctx).kind, "hidden");
});

test("meshTermsCurrent: a matching, unexpired acceptance counts even on a paused or sourced mesh", () => {
  const now = new Date("2026-09-26T00:00:00Z");
  const accepted = { terms_accepted_version: "v1", terms_expires_at: "2027-01-01T00:00:00Z" };
  assert.equal(meshTermsCurrent(accepted, "v1", now), true);
  assert.equal(meshTermsCurrent(accepted, "v2", now), false);
  assert.equal(meshTermsCurrent({ ...accepted, terms_expires_at: "2026-09-01T00:00:00Z" }, "v1", now), false);
  assert.equal(meshTermsCurrent({ terms_accepted_version: undefined, terms_expires_at: undefined }, "v1", now), false);
});
