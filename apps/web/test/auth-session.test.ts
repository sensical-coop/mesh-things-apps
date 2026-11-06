import assert from "node:assert/strict";
import test from "node:test";
import { isOwnerSession } from "../src/features/auth/session.ts";

test("stale me data after a failed refetch is not a session", () => {
  assert.equal(isOwnerSession({ isSuccess: true, data: { is_active: true } }), true);
  assert.equal(isOwnerSession({ isSuccess: false, data: { is_active: true } }), false);
  assert.equal(isOwnerSession({ isSuccess: false, data: undefined }), false);
});

test("an inactive owner (email not verified yet) is not a usable session", () => {
  assert.equal(isOwnerSession({ isSuccess: true, data: { is_active: false } }), false);
});
