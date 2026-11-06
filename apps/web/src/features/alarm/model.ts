import type { DeviceMeasurement, MeasurementTypeRead, TelemetryVariantRead } from "@mtt/contracts";
import { groupByTelemetryVariant } from "../device/variant-groups.ts";
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
  return groupByTelemetryVariant(
    measurements.filter((row) => isChartableMeasurement(row.measurement_type)),
    (row) => row.telemetry_variant_id,
  ).map((group) => {
    const variant = variantById.get(group.key);
    return {
      key: group.key,
      title: variant?.name ?? variant?.payload_kind,
      channels: group.items.map((row) => ({
        key: row.id,
        channel: row.measurement_type.channel,
        label: row.measurement_type.display_name ?? row.measurement_type.channel,
        detectors: row.effective_detectors,
      })),
    };
  });
}
