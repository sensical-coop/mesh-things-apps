import assert from "node:assert/strict";
import test from "node:test";
import { isOperator, isOwnerSession } from "../src/features/auth/session.ts";

test("stale me data after a failed refetch is not a session", () => {
  assert.equal(isOwnerSession({ isSuccess: true, data: { is_active: true } }), true);
  assert.equal(isOwnerSession({ isSuccess: false, data: { is_active: true } }), false);
  assert.equal(isOwnerSession({ isSuccess: false, data: undefined }), false);
});

test("an inactive owner (email not verified yet) is not a usable session", () => {
  assert.equal(isOwnerSession({ isSuccess: true, data: { is_active: false } }), false);
});

test("isOperator is operators and superusers, never while me is missing", () => {
  assert.equal(isOperator({ is_superuser: false, role: "operator" }), true);
  assert.equal(isOperator({ is_superuser: true, role: "member" }), true);
  assert.equal(isOperator({ is_superuser: false, role: "member" }), false);
  assert.equal(isOperator(undefined), false);
});
