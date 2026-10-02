import assert from "node:assert/strict";
import test from "node:test";
import { matchesSearch } from "../src/lib/search.ts";

test("matchesSearch ignores case and accents", () => {
  assert.equal(matchesSearch("José Álvarez", "jose alv"), true);
});

test("matchesSearch needs every word, in any order", () => {
  assert.equal(matchesSearch("Ada Owner", "owner ada"), true);
  assert.equal(matchesSearch("Ada Owner", "ada river"), false);
});

test("matchesSearch matches everything on an empty query", () => {
  assert.equal(matchesSearch("Bo", "   "), true);
});
