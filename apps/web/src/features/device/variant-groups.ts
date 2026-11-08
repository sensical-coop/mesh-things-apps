import { isDerivedMeasurement } from "../../lib/measurement.ts";

/** Derived channels share this group and sort after what the device reports. */
export const COMPUTED_VARIANT_GROUP = "computed";

export type VariantGroup<T> = { key: string; items: T[] };

/**
 * First-seen order. A channel `isDerivedMeasurement` shares one group, placed last.
 * An empty variant id stays empty so the caller can title it as "other".
 */
export function groupByTelemetryVariant<T>(
  items: readonly T[],
  variantIdOf: (item: T) => string,
  channelOf: (item: T) => string,
): VariantGroup<T>[] {
  const groups = new Map<string, T[]>();
  const order: string[] = [];
  for (const item of items) {
    const id = isDerivedMeasurement({ channel: channelOf(item) }) ? COMPUTED_VARIANT_GROUP : variantIdOf(item);
    const rows = groups.get(id);
    if (rows) rows.push(item);
    else {
      groups.set(id, [item]);
      order.push(id);
    }
  }
  const sorted = [
    ...order.filter((id) => id !== COMPUTED_VARIANT_GROUP),
    ...order.filter((id) => id === COMPUTED_VARIANT_GROUP),
  ];
  return sorted.flatMap((id) => {
    const rows = groups.get(id);
    return rows ? [{ key: id, items: rows }] : [];
  });
}
