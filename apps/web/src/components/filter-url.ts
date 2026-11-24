import {
  multiValueFilterOperators,
  serializeListFilterValue,
  splitListFilterValue,
  valuelessFilterOperators,
} from "@mtt/contracts/list-filter";
import { createParser } from "nuqs";
import {
  createFilterQuery,
  createFilterRule,
  flattenFilterConditions,
} from "@mtt/ui/components/reui/filters/filters-query";
import type { FilterQuery } from "@mtt/ui/components/reui/filters/filters-types";

export type ParsedFilterValue = {
  operator: string;
  values: string[];
};

export const parseAsFilterValue = createParser({
  parse(query) {
    const split = splitListFilterValue(query);
    if (!split || (!split.values.length && !valuelessFilterOperators.has(split.operator))) return null;
    return split;
  },
  serialize(value) {
    if (!value) return "";
    const { operator, values } = value;
    if (!values.length && !valuelessFilterOperators.has(operator)) return "";
    return serializeListFilterValue({ operator, values });
  },
});

export function filterUrlPatchEquals(
  a: Record<string, ParsedFilterValue | null>,
  b: Record<string, ParsedFilterValue | null>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (JSON.stringify(a[key] ?? null) !== JSON.stringify(b[key] ?? null)) return false;
  }
  return true;
}

export function queryToUrlPatch(query: FilterQuery, urlKeys: Record<string, string>) {
  const patch: Record<string, ParsedFilterValue | null> = {};
  for (const urlKey of Object.values(urlKeys)) patch[urlKey] = null;
  for (const condition of flattenFilterConditions(query)) {
    const urlKey = urlKeys[condition.field];
    if (!urlKey) continue;
    const values = condition.values.map(String).filter((v) => v.length > 0);
    if (!values.length && !valuelessFilterOperators.has(condition.operator)) continue;
    patch[urlKey] = { operator: condition.operator, values };
  }
  return patch;
}

export function urlStateToQuery(
  urlState: Record<string, ParsedFilterValue | null>,
  urlKeys: Record<string, string>,
): FilterQuery {
  const byUrl = new Map(Object.entries(urlKeys).map(([field, urlKey]) => [urlKey, field]));
  const rules = [];
  for (const [urlKey, parsed] of Object.entries(urlState)) {
    if (!parsed) continue;
    const field = byUrl.get(urlKey);
    if (!field) continue;
    const value = valuelessFilterOperators.has(parsed.operator)
      ? undefined
      : multiValueFilterOperators.has(parsed.operator) || parsed.values.length > 1
        ? parsed.values
        : parsed.values[0];
    rules.push(
      createFilterRule({
        id: `url-${field}`,
        path: [field],
        operator: parsed.operator,
        value,
      }),
    );
  }
  return createFilterQuery(rules);
}
