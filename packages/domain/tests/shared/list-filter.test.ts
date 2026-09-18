import { describe, expect, it } from "vitest";
import {
  matchesListFilters,
  parseListFilterValue,
  parseListFilters,
} from "../../src/shared/list-filter";

describe("list-filter", () => {
  it("parses operator:value and bare values as is", () => {
    expect(parseListFilterValue("contains:Hill")).toEqual({ operator: "contains", values: ["Hill"] });
    expect(parseListFilterValue("true")).toEqual({ operator: "is", values: ["true"] });
    expect(parseListFilterValue("is_any_of:a|b")).toEqual({ operator: "is_any_of", values: ["a", "b"] });
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
});
