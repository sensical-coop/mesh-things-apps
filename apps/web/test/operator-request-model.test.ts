import assert from "node:assert/strict";
import test from "node:test";
import { canDecideOperatorRequests, canRequestOperator } from "../src/features/operator-request/model.ts";

const member = { id: "ada", is_superuser: false, is_staff: false, role: "member" as const, is_active: true };

test("only a plain member can ask for the operator role", () => {
  assert.equal(canRequestOperator(member), true);
  assert.equal(canRequestOperator({ ...member, role: "operator" }), false);
  assert.equal(canRequestOperator({ ...member, is_staff: true }), false);
  assert.equal(canRequestOperator({ ...member, is_superuser: true }), false);
  assert.equal(canRequestOperator(undefined), false);
});

test("only superusers decide operator requests", () => {
  assert.equal(canDecideOperatorRequests({ id: "admin", is_superuser: true, is_staff: true, role: "member", is_active: true }), true);
  assert.equal(canDecideOperatorRequests({ ...member, is_staff: true }), false);
  assert.equal(canDecideOperatorRequests(undefined), false);
});
