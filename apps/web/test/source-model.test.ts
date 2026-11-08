import assert from "node:assert/strict";
import test from "node:test";
import { sourceTitle } from "../src/features/source/model.ts";

test("sourceTitle falls back to server and topic", () => {
  assert.equal(sourceTitle({ label: "EU public", server: "a:1", topic: "t" }), "EU public");
  assert.equal(sourceTitle({ label: "  ", server: "a:1", topic: "t/#" }), "a:1 t/#");
});
