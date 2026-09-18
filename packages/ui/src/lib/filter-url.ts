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

export function toWireOperator(operator: string): string {
  switch (operator) {
    case "is_none_of":
    case "has_none_of":
      return "is_not_any_of";
    case "eq":
      return "equals";
    case "gt":
      return "greater_than";
    case "lt":
      return "less_than";
    case "has_any_of":
    case "has_all_of":
      // ponytail: backend has no AND-of-values; drop to any-of until it does
      return "is_any_of";
    default:
      return operator;
  }
}

const NONE_ARITY = new Set(["empty", "not_empty"]);
const MANY_ARITY = new Set([
  "is_any_of",
  "is_none_of",
  "is_not_any_of",
  "has_any_of",
  "has_all_of",
  "has_none_of",
]);

export const parseAsFilterValue = createParser({
  parse(query) {
    if (!query) return null;
    const idx = query.indexOf(":");
    if (idx === -1) return null;
    const operator = query.slice(0, idx);
    const valuesPart = query.slice(idx + 1);
    const values = valuesPart ? valuesPart.split("|").filter((v) => v.length > 0) : [];
    if (!values.length && !NONE_ARITY.has(operator)) return null;
    return { operator, values };
  },
  serialize(value) {
    if (!value) return "";
    const { operator, values } = value;
    if (!values.length && !NONE_ARITY.has(operator)) return "";
    return `${operator}:${values.join("|")}`;
  },
});

export function serializeListFilterValue(filter: { operator: string; values: string[] }): string {
  return `${filter.operator}:${filter.values.join("|")}`;
}

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
    if (!values.length && !NONE_ARITY.has(condition.operator)) continue;
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
    const value = NONE_ARITY.has(parsed.operator)
      ? undefined
      : MANY_ARITY.has(parsed.operator) || parsed.values.length > 1
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

export function listQuery(qs: string): Record<string, string> | undefined {
  if (!qs) return undefined;
  return Object.fromEntries(new URLSearchParams(qs));
}
