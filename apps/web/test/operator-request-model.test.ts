import assert from "node:assert/strict";
import test from "node:test";
import { canRequestOperator } from "../src/features/operator-request/model.ts";

test("canRequestOperator is false without a viewer", () => {
  assert.equal(canRequestOperator(undefined), false);
});
