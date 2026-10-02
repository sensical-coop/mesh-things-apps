import assert from "node:assert/strict";
import test from "node:test";
import { listQueryBoolean, matchesListQuery, parseListQuery } from "../src/lib/list-filter.ts";

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

test("listQueryBoolean reduces a filter to the bare boolean the API takes", () => {
  assert.equal(listQueryBoolean("has_postprocessing=is%3Atrue", "has_postprocessing"), true);
  assert.equal(listQueryBoolean("has_postprocessing=is_not%3Atrue", "has_postprocessing"), false);
  assert.equal(listQueryBoolean("has_postprocessing=false", "has_postprocessing"), false);
  assert.equal(listQueryBoolean("has_postprocessing=is_any_of%3Atrue%7Cfalse", "has_postprocessing"), undefined);
  assert.equal(listQueryBoolean("label=contains%3Ax", "has_postprocessing"), undefined);
});

test("matchesListQuery matches a multi-valued field as a set", () => {
  const variants: Record<string, string[]> = { telemetry_variant: ["env", "air"] };
  const getList = (field: string) => variants[field];
  assert.equal(matchesListQuery(getList, "telemetry_variant=has_any_of:air|power"), true);
  assert.equal(matchesListQuery(getList, "telemetry_variant=has_all_of:env|air"), true);
  assert.equal(matchesListQuery(getList, "telemetry_variant=has_all_of:env|power"), false);
  assert.equal(matchesListQuery(getList, "telemetry_variant=has_none_of:env"), false);
  assert.equal(matchesListQuery(getList, "telemetry_variant=has_none_of:power"), true);
  assert.equal(matchesListQuery(getList, "telemetry_variant=empty:"), false);
  assert.equal(matchesListQuery(() => [], "telemetry_variant=empty:"), true);
});
