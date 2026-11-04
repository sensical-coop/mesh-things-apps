import assert from "node:assert/strict";
import test from "node:test";
import { RETURN_PATHS, safeReturnPath } from "../src/lib/return-path.ts";

test("allows the exact /start path", () => {
  assert.deepEqual(RETURN_PATHS, ["/start"]);
  assert.equal(safeReturnPath("/start"), "/start");
});

test("rejects protocol-relative, absolute, traversal, and query suffixes", () => {
  assert.equal(safeReturnPath("//evil.example"), undefined);
  assert.equal(safeReturnPath("https://x"), undefined);
  assert.equal(safeReturnPath("/start/../x"), undefined);
  assert.equal(safeReturnPath("/start?x=1"), undefined);
  assert.equal(safeReturnPath("/start/"), undefined);
  assert.equal(safeReturnPath(""), undefined);
  assert.equal(safeReturnPath(null), undefined);
  assert.equal(safeReturnPath(undefined), undefined);
});
