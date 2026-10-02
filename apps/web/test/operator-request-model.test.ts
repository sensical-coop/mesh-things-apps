import assert from "node:assert/strict";
import test from "node:test";
import { canDecideOperatorRequests, canRequestOperator } from "../src/features/operator-request/model.ts";

const member = { is_superuser: false, is_staff: false, role: "member" } as const;

test("only a plain member can ask for the operator role", () => {
  assert.equal(canRequestOperator(member), true);
  assert.equal(canRequestOperator({ ...member, role: "operator" }), false);
  assert.equal(canRequestOperator({ ...member, is_staff: true }), false);
  assert.equal(canRequestOperator({ ...member, is_superuser: true }), false);
  assert.equal(canRequestOperator(undefined), false);
});

test("only superusers decide operator requests", () => {
  assert.equal(canDecideOperatorRequests({ is_superuser: true }), true);
  assert.equal(canDecideOperatorRequests({ is_superuser: false }), false);
  assert.equal(canDecideOperatorRequests(undefined), false);
});
