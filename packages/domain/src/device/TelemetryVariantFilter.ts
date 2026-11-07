/** A `telemetry_variant` list filter after `@mtt/contracts/list-filter` has parsed it. */
export type TelemetryVariantFilter = {
  operator: "has_any_of" | "has_all_of" | "has_none_of";
  ids: string[];
};

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
