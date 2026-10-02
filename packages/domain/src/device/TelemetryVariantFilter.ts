// The registry's `telemetry_variant` list filter: `has_any_of`, `has_all_of` or
// `has_none_of`, then `:` and variant ids separated by `|`. Bare ids mean `has_any_of`.

export type TelemetryVariantFilter = {
  operator: "has_any_of" | "has_all_of" | "has_none_of";
  ids: string[];
};

const OPERATORS = new Set<string>(["has_any_of", "has_all_of", "has_none_of"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Null when malformed: an unknown operator, no ids, or an id that isn't a uuid. */
export function parseTelemetryVariantFilter(raw: string): TelemetryVariantFilter | null {
  const idx = raw.indexOf(":");
  const operator = idx === -1 ? "has_any_of" : raw.slice(0, idx);
  if (!OPERATORS.has(operator)) return null;
  const ids = (idx === -1 ? raw : raw.slice(idx + 1)).split("|").filter((id) => id.length > 0);
  if (!ids.length || !ids.every((id) => UUID.test(id))) return null;
  return { operator: operator as TelemetryVariantFilter["operator"], ids: ids.map((id) => id.toLowerCase()) };
}

export function matchesTelemetryVariantFilter(reported: readonly string[], filter: TelemetryVariantFilter): boolean {
  const seen = new Set(reported.map((id) => id.toLowerCase()));
  switch (filter.operator) {
    case "has_any_of":
      return filter.ids.some((id) => seen.has(id));
    case "has_all_of":
      return filter.ids.every((id) => seen.has(id));
    case "has_none_of":
      return !filter.ids.some((id) => seen.has(id));
  }
}
