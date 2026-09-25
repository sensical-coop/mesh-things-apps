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
