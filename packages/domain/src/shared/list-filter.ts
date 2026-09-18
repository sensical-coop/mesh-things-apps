export const listFilterOperators = [
  "is",
  "is_not",
  "is_any_of",
  "is_not_any_of",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "equals",
  "greater_than",
  "less_than",
  "empty",
  "not_empty",
] as const;

export type ListFilterOperator = (typeof listFilterOperators)[number];

export type ListFilter = {
  field: string;
  operator: ListFilterOperator;
  values: string[];
};

const operators = new Set<string>(listFilterOperators);
const scalarOperators = new Set<ListFilterOperator>([
  "is",
  "is_not",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "equals",
  "greater_than",
  "less_than",
]);

/** Parse `operator:value1|value2`. Bare values become `is:<value>`. */
export function parseListFilterValue(raw: string): { operator: ListFilterOperator; values: string[] } | null {
  if (!raw) return null;
  const idx = raw.indexOf(":");
  if (idx === -1) return { operator: "is", values: [raw] };
  const operator = raw.slice(0, idx);
  if (!operators.has(operator)) return { operator: "is", values: [raw] };
  const values = raw
    .slice(idx + 1)
    .split("|")
    .filter((v) => v.length > 0);
  const op = operator as ListFilterOperator;
  if (!values.length && scalarOperators.has(op)) return null;
  return { operator: op, values };
}

export function serializeListFilterValue(filter: { operator: string; values: string[] }): string {
  return `${filter.operator}:${filter.values.join("|")}`;
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

export function matchesListFilters(get: (field: string) => string | undefined, filters: ListFilter[]): boolean {
  for (const filter of filters) {
    const value = get(filter.field);
    if (value === undefined) continue;
    if (!matchCell(value, filter)) return false;
  }
  return true;
}

function matchCell(value: string, filter: ListFilter): boolean {
  const cell = value.toLowerCase();
  const needles = filter.values.map((v) => v.toLowerCase());
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
      return first.length > 0 && cell.includes(first);
    case "not_contains":
      return first.length === 0 || !cell.includes(first);
    case "starts_with":
      return first.length > 0 && cell.startsWith(first);
    case "ends_with":
      return first.length > 0 && cell.endsWith(first);
    case "empty":
      return value.length === 0;
    case "not_empty":
      return value.length > 0;
    case "greater_than":
      return Number(value) > Number(filter.values[0]);
    case "less_than":
      return Number(value) < Number(filter.values[0]);
  }
}
