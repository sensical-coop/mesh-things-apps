import { matchesListFilters, type ListFilter } from "@mtt/contracts/list-filter";

/** A list route's filterable fields: each wire name (`operator:v1|v2` in the query) and how to read it off a row. */
export function listFilterFields<Args extends unknown[]>(
  fields: readonly { wire: string; read: (...args: Args) => string | boolean }[],
) {
  return {
    names: fields.map((row) => row.wire),
    matches(filters: ListFilter[], ...args: Args): boolean {
      return matchesListFilters((field) => {
        const value = fields.find((row) => row.wire === field)?.read(...args);
        return value === undefined ? undefined : String(value);
      }, filters);
    },
  };
}
