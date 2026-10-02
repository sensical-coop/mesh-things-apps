// Filters rows already loaded, with the same `operator:v1|v2` wire the URL and the API use
// (see packages/domain/src/shared/list-filter.ts, which web can't import).

type Filter = { field: string; operator: string; values: string[] };

/** Every `field=operator:values` of a smart-filter query string. Bare values mean `is:<value>`. */
export function parseListQuery(queryString: string): Filter[] {
  const filters: Filter[] = [];
  for (const [field, raw] of new URLSearchParams(queryString)) {
    if (!raw) continue;
    const idx = raw.indexOf(":");
    const operator = idx === -1 ? "is" : raw.slice(0, idx);
    const values = (idx === -1 ? raw : raw.slice(idx + 1)).split("|").filter((value) => value.length > 0);
    filters.push({ field, operator, values });
  }
  return filters;
}

/**
 * Whether a row passes every filter. `get` returns the row's text for a field, a list for a
 * multi-valued field (matched with `has_any_of`, `has_all_of`, `has_none_of`), or undefined to ignore it.
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

function matchList(values: readonly string[], filter: Filter): boolean {
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

function matchCell(value: string, filter: Filter): boolean {
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
