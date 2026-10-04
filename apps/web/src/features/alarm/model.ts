import type { DeviceMeasurement, MeasurementTypeRead, TelemetryVariantRead } from "@mtt/contracts";
import { isChartableMeasurement } from "../../lib/measurement.ts";

/** The parts of a device measurement the alarms list reads. */
export type AlarmMeasurement = Pick<DeviceMeasurement, "id" | "telemetry_variant_id" | "effective_detectors"> & {
  measurement_type: Pick<MeasurementTypeRead, "channel" | "origin" | "display_name">;
};
export type AlarmChannel = { key: string; channel: string; label: string; detectors: string[] };
export type AlarmVariantGroup = { key: string; title: string | undefined; channels: AlarmChannel[] };

/**
 * A device's chartable channels grouped by the telemetry variant that reports them, in
 * the order the API lists them. `title` is undefined for a variant missing from the catalog.
 */
export function alarmVariantGroups(
  measurements: readonly AlarmMeasurement[],
  variants: readonly Pick<TelemetryVariantRead, "id" | "name" | "payload_kind">[],
): AlarmVariantGroup[] {
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const groups = new Map<string, AlarmVariantGroup>();
  for (const row of measurements) {
    if (!isChartableMeasurement(row.measurement_type)) continue;
    let group = groups.get(row.telemetry_variant_id);
    if (!group) {
      const variant = variantById.get(row.telemetry_variant_id);
      group = { key: row.telemetry_variant_id, title: variant?.name ?? variant?.payload_kind, channels: [] };
      groups.set(row.telemetry_variant_id, group);
    }
    const label = row.measurement_type.display_name ?? row.measurement_type.channel;
    group.channels.push({
      key: row.id,
      channel: row.measurement_type.channel,
      label,
      detectors: row.effective_detectors,
    });
  }
  return [...groups.values()];
}
