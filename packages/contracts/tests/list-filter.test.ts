import { describe, expect, it } from "vitest";
import {
  listQueryBoolean,
  matchesListFilters,
  matchesListQuery,
  parseListFilterValue,
  parseListFilters,
  parseListQuery,
} from "../src/list-filter";

describe("list-filter", () => {
  it("parses operator:value and bare values as is", () => {
    expect(parseListFilterValue("contains:Hill")).toEqual({ operator: "contains", values: ["Hill"] });
    expect(parseListFilterValue("true")).toEqual({ operator: "is", values: ["true"] });
    expect(parseListFilterValue("is_any_of:a|b")).toEqual({ operator: "is_any_of", values: ["a", "b"] });
    expect(parseListFilterValue("has_any_of:a|b")).toEqual({ operator: "has_any_of", values: ["a", "b"] });
    expect(parseListFilterValue("nope:x")).toEqual({ operator: "is", values: ["nope:x"] });
    expect(parseListFilterValue("contains:")).toBeNull();
    expect(parseListFilterValue("empty:")).toEqual({ operator: "empty", values: [] });
  });

  it("does not treat a list operator as matching every scalar", () => {
    const filters = parseListFilters({ label: "has_any_of:a|b" });
    expect(matchesListFilters(() => "Hill", filters)).toBe(false);
    expect(matchesListQuery(() => ["a"], "telemetry_variant=has_any_of:a|b")).toBe(true);
  });

  it("filters rows with contains and is", () => {
    const rows = [
      { label: "Hill", channel_id: "LongFast" },
      { label: "River", channel_id: "LongFast" },
    ];
    const get = (row: (typeof rows)[0]) => (field: string) => {
      if (field === "label") return row.label;
      if (field === "channel_id") return row.channel_id;
      return undefined;
    };
    const filters = parseListFilters({ label: "contains:ill" });
    expect(rows.filter((row) => matchesListFilters(get(row), filters)).map((r) => r.label)).toEqual(["Hill"]);
  });

  it("reads the smart-filter query string", () => {
    expect(parseListQuery("label=contains%3Ahi&status=is_any_of%3Aactive%7CrenewSoon")).toEqual([
      { field: "label", operator: "contains", values: ["hi"] },
      { field: "status", operator: "is_any_of", values: ["active", "renewSoon"] },
    ]);
    expect(parseListQuery("source=default")).toEqual([{ field: "source", operator: "is", values: ["default"] }]);
    expect(parseListQuery("label=nope:x")).toEqual([{ field: "label", operator: "is", values: ["nope:x"] }]);
    expect(parseListQuery("label=contains:")).toEqual([]);
  });

  it("needs every filter to pass", () => {
    const hill: Record<string, string> = { label: "Hill", status: "active", source: "default", devices: "true" };
    const get = (field: string) => hill[field];
    expect(matchesListQuery(get, "")).toBe(true);
    expect(matchesListQuery(get, "label=contains:hi&status=is:active")).toBe(true);
    expect(matchesListQuery(get, "label=contains:hi&status=is_not:active")).toBe(false);
    expect(matchesListQuery(get, "status=is_any_of:renewSoon|termsChanged")).toBe(false);
    expect(matchesListQuery(get, "unknown_field=is:x")).toBe(true);
  });

  it("reduces a filter to the bare boolean the API takes", () => {
    expect(listQueryBoolean("has_postprocessing=is%3Atrue", "has_postprocessing")).toBe(true);
    expect(listQueryBoolean("has_postprocessing=is_not%3Atrue", "has_postprocessing")).toBe(false);
    expect(listQueryBoolean("has_postprocessing=false", "has_postprocessing")).toBe(false);
    expect(listQueryBoolean("has_postprocessing=is_any_of%3Atrue%7Cfalse", "has_postprocessing")).toBeUndefined();
    expect(listQueryBoolean("label=contains%3Ax", "has_postprocessing")).toBeUndefined();
  });

  it("matches a multi-valued field as a set", () => {
    const variants: Record<string, string[]> = { telemetry_variant: ["env", "air"] };
    const getList = (field: string) => variants[field];
    expect(matchesListQuery(getList, "telemetry_variant=has_any_of:air|power")).toBe(true);
    expect(matchesListQuery(getList, "telemetry_variant=has_all_of:env|air")).toBe(true);
    expect(matchesListQuery(getList, "telemetry_variant=has_all_of:env|power")).toBe(false);
    expect(matchesListQuery(getList, "telemetry_variant=has_none_of:env")).toBe(false);
    expect(matchesListQuery(getList, "telemetry_variant=has_none_of:power")).toBe(true);
    expect(matchesListQuery(getList, "telemetry_variant=empty:")).toBe(false);
    expect(matchesListQuery(() => [], "telemetry_variant=empty:")).toBe(true);
  });
});
