import assert from "node:assert/strict";
import test from "node:test";
import { matchesListQuery, parseListQuery } from "../src/lib/list-filter.ts";

const hill: Record<string, string> = { label: "Hill", status: "active", source: "default", devices: "true" };
const get = (field: string) => hill[field];

test("parseListQuery reads the smart-filter wire", () => {
  assert.deepEqual(parseListQuery("label=contains%3Ahi&status=is_any_of%3Aactive%7CrenewSoon"), [
    { field: "label", operator: "contains", values: ["hi"] },
    { field: "status", operator: "is_any_of", values: ["active", "renewSoon"] },
  ]);
  assert.deepEqual(parseListQuery("source=default"), [{ field: "source", operator: "is", values: ["default"] }]);
});

test("matchesListQuery needs every filter to pass", () => {
  assert.equal(matchesListQuery(get, ""), true);
  assert.equal(matchesListQuery(get, "label=contains:hi&status=is:active"), true);
  assert.equal(matchesListQuery(get, "label=contains:hi&status=is_not:active"), false);
  assert.equal(matchesListQuery(get, "status=is_any_of:renewSoon|termsChanged"), false);
  assert.equal(matchesListQuery(get, "unknown_field=is:x"), true);
});
