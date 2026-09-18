import assert from "node:assert/strict";
import test from "node:test";
import { isOwnerSession } from "../src/features/auth/session.ts";

test("stale me data after a failed refetch is not a session", () => {
  assert.equal(isOwnerSession({ isSuccess: true, data: { id: "1" } }), true);
  assert.equal(isOwnerSession({ isSuccess: false, data: { id: "1" } }), false);
  assert.equal(isOwnerSession({ isSuccess: false, data: undefined }), false);
});
