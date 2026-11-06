/** `scalar` needs one value; `none` takes none; `many` is a set. */
const operatorTable = [
  ["is", "scalar"],
  ["is_not", "scalar"],
  ["is_any_of", "many"],
  ["is_not_any_of", "many"],
  ["contains", "scalar"],
  ["not_contains", "scalar"],
  ["starts_with", "scalar"],
  ["ends_with", "scalar"],
  ["equals", "scalar"],
  ["greater_than", "scalar"],
  ["less_than", "scalar"],
  ["empty", "none"],
  ["not_empty", "none"],
  ["has_any_of", "many"],
  ["has_all_of", "many"],
  ["has_none_of", "many"],
] as const;

export type ListFilterOperator = (typeof operatorTable)[number][0];

type OperatorArity = (typeof operatorTable)[number][1];

const operatorArity = new Map<string, OperatorArity>(operatorTable);

/** `empty` and `not_empty`: a filter with no values still counts. */
export const valuelessFilterOperators = new Set<string>(
  operatorTable.flatMap(([operator, arity]) => (arity === "none" ? [operator] : [])),
);

/** Set operators. `is_none_of` is the filter UI's name for `is_not_any_of` and can still sit in the URL. */
export const multiValueFilterOperators = new Set<string>([
  ...operatorTable.flatMap(([operator, arity]) => (arity === "many" ? [operator] : [])),
  "is_none_of",
]);

export type ListFilter = {
  field: string;
  operator: ListFilterOperator;
  values: string[];
};

const listOnlyOperators = new Set<string>(["has_any_of", "has_all_of", "has_none_of"]);

/**
 * `operator:value1|value2`. A bare value is `is:<value>`. An unknown operator is
 * `is` of the whole token. A scalar operator with no values is dropped.
 */
export function parseListFilterValue(raw: string): { operator: ListFilterOperator; values: string[] } | null {
  if (!raw) return null;
  const idx = raw.indexOf(":");
  if (idx === -1) return { operator: "is", values: [raw] };
  const operator = raw.slice(0, idx);
  const arity = operatorArity.get(operator);
  if (!arity) return { operator: "is", values: [raw] };
  const values = raw
    .slice(idx + 1)
    .split("|")
    .filter((value) => value.length > 0);
  if (!values.length && arity === "scalar") return null;
  return { operator: operator as ListFilterOperator, values };
}

export function serializeListFilterValue(filter: { operator: string; values: string[] }): string {
  return `${filter.operator}:${filter.values.join("|")}`;
}

/** UI operator ids that are not the wire name. */
export function toWireOperator(operator: string): string {
  switch (operator) {
    case "is_none_of":
      return "is_not_any_of";
    case "eq":
      return "equals";
    case "gt":
      return "greater_than";
    case "lt":
      return "less_than";
    default:
      return operator;
  }
}

export function parseListFilters(query: Record<string, string | undefined>): ListFilter[] {
  const out: ListFilter[] = [];
  for (const [field, raw] of Object.entries(query)) {
    if (!raw) continue;
    const parsed = parseListFilterValue(raw);
    if (parsed) out.push({ field, ...parsed });
  }
  return out;
}

/** Every `field=operator:values` of a query string, parsed like {@link parseListFilterValue}. */
export function parseListQuery(queryString: string): ListFilter[] {
  const filters: ListFilter[] = [];
  for (const [field, raw] of new URLSearchParams(queryString)) {
    if (!raw) continue;
    const parsed = parseListFilterValue(raw);
    if (parsed) filters.push({ field, ...parsed });
  }
  return filters;
}

/** A scalar field has no set. Those operators stay the whole token, matched as `is`. */
function asScalarFilter(filter: ListFilter): ListFilter {
  if (!listOnlyOperators.has(filter.operator)) return filter;
  return { field: filter.field, operator: "is", values: [`${filter.operator}:${filter.values.join("|")}`] };
}

export function matchesListFilters(get: (field: string) => string | undefined, filters: ListFilter[]): boolean {
  for (const filter of filters) {
    const value = get(filter.field);
    if (value === undefined) continue;
    if (!matchCell(value, asScalarFilter(filter))) return false;
  }
  return true;
}

/**
 * Whether a row passes every filter. `get` returns text, a list (matched with
 * `has_any_of` / `has_all_of` / `has_none_of`), or undefined to ignore the field.
 */
export function matchesListQuery(
  get: (field: string) => string | readonly string[] | undefined,
  queryString: string,
): boolean {
  return parseListQuery(queryString).every((filter) => {
    const value = get(filter.field);
    if (value === undefined) return true;
    return typeof value === "string" ? matchCell(value, filter) : matchList(value, filter);
  });
}

/** A boolean filter reduced to the bare `true`/`false` the API takes, or undefined when it doesn't narrow. */
export function listQueryBoolean(queryString: string, field: string): boolean | undefined {
  const filter = parseListQuery(queryString).find((candidate) => candidate.field === field);
  if (!filter) return undefined;
  const passing = ["true", "false"].filter((value) => matchCell(value, filter));
  return passing.length === 1 ? passing[0] === "true" : undefined;
}

function matchList(values: readonly string[], filter: ListFilter): boolean {
  const have = new Set(values.map((value) => value.toLowerCase()));
  const needles = filter.values.map((needle) => needle.toLowerCase());
  switch (filter.operator) {
    case "is":
    case "is_any_of":
    case "has_any_of":
      return needles.some((needle) => have.has(needle));
    case "has_all_of":
      return needles.every((needle) => have.has(needle));
    case "is_not_any_of":
    case "has_none_of":
      return !needles.some((needle) => have.has(needle));
    case "empty":
      return have.size === 0;
    case "not_empty":
      return have.size > 0;
    default:
      return true;
  }
}

function matchCell(value: string, filter: ListFilter): boolean {
  const cell = value.toLowerCase();
  const needles = filter.values.map((needle) => needle.toLowerCase());
  const first = needles[0] ?? "";
  switch (filter.operator) {
    case "is":
    case "equals":
      return cell === first;
    case "is_not":
      return cell !== first;
    case "is_any_of":
      return needles.includes(cell);
    case "is_not_any_of":
      return !needles.includes(cell);
    case "contains":
      return cell.includes(first);
    case "not_contains":
      return !first || !cell.includes(first);
    case "starts_with":
      return cell.startsWith(first);
    case "ends_with":
      return cell.endsWith(first);
    case "empty":
      return value.length === 0;
    case "not_empty":
      return value.length > 0;
    case "greater_than":
      return Number(value) > Number(filter.values[0]);
    case "less_than":
      return Number(value) < Number(filter.values[0]);
    default:
      return true;
  }
}
