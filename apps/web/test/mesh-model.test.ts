import assert from "node:assert/strict";
import test from "node:test";
import { canEditMesh, meshTitle } from "../src/features/mesh/model.ts";

const mine = { id: "ada", is_superuser: false };
const admin = { id: "root", is_superuser: true };

test("canEditMesh lets the owner edit their mesh, public or not", () => {
  assert.equal(canEditMesh({ owner_id: "ada" }, mine), true);
});

test("canEditMesh keeps someone else's mesh read-only, even when public", () => {
  assert.equal(canEditMesh({ owner_id: "bo" }, mine), false);
});

test("canEditMesh lets a superuser edit any mesh", () => {
  assert.equal(canEditMesh({ owner_id: "bo" }, admin), true);
});

test("canEditMesh hides writes while the caller is unknown", () => {
  assert.equal(canEditMesh({ owner_id: "ada" }, undefined), false);
});

test("meshTitle falls back to the channel id", () => {
  assert.equal(meshTitle({ label: "  ", channel_id: "LongFast" }), "LongFast");
  assert.equal(meshTitle({ label: "Hill", channel_id: "LongFast" }), "Hill");
});

test("meshTermsStanding: only a default-broker mesh the caller may see has mesh terms", async () => {
  const { meshTermsStanding } = await import("../src/features/mesh/model.ts");
  const now = new Date("2026-09-26T00:00:00Z");
  const own = { source_id: null, terms_accepted_version: "meshes-2026-09", terms_expires_at: "2027-09-26T00:00:00Z", paused_at: null };
  assert.equal(meshTermsStanding(own, "meshes-2026-09", now), "ok");
  assert.equal(meshTermsStanding({ ...own, paused_at: "2026-09-20T00:00:00Z" }, "meshes-2026-09", now), "lapsed");
  assert.equal(meshTermsStanding({ ...own, terms_accepted_version: null }, "meshes-2026-09", now), "none");
  // On a source, the source's terms apply.
  assert.equal(meshTermsStanding({ ...own, source_id: "src" }, "meshes-2026-09", now), null);
  // Someone else's mesh: the API hides the fields.
  assert.equal(meshTermsStanding({ source_id: null }, "meshes-2026-09", now), null);
});

test("meshStatus covers every state the Status column shows", async () => {
  const { meshStatus } = await import("../src/features/mesh/model.ts");
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

test("the Status column sorts the most urgent first", async () => {
  const { MESH_STATUS_RANK } = await import("../src/features/mesh/model.ts");
  const order = Object.entries(MESH_STATUS_RANK).sort((a, b) => a[1] - b[1]).map(([k]) => k);
  assert.deepEqual(order.slice(0, 2), ["scheduledForDeletion", "sourcePaused"]);
  assert.deepEqual(order.slice(-2), ["active", "hidden"]);
});
