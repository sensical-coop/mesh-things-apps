import type { DeviceMeasurement, MeasurementTypeRead } from "@mtt/contracts";
import { groupByTelemetryVariant } from "../device/variant-groups.ts";
import { isChartableMeasurement, measurementLabel } from "../../lib/measurement.ts";

export type AlarmMeasurement = Pick<DeviceMeasurement, "id" | "telemetry_variant_id" | "effective_detectors"> & {
  measurement_type: Pick<MeasurementTypeRead, "channel" | "origin" | "display_name">;
};
export type AlarmChannel = { key: string; channel: string; label: string; detectors: string[] };
export type AlarmVariantGroup = { key: string; channels: AlarmChannel[] };

/**
 * A device's chartable channels grouped like the device page: one group per telemetry
 * variant, derived channels last under `computed`.
 */
export function alarmVariantGroups(
  measurements: readonly AlarmMeasurement[],
): AlarmVariantGroup[] {
  return groupByTelemetryVariant(
    measurements.filter((row) => isChartableMeasurement(row.measurement_type)),
    (row) => row.telemetry_variant_id,
    (row) => row.measurement_type.channel,
  ).map((group) => ({
    key: group.key,
    channels: group.items.map((row) => ({
      key: row.id,
      channel: row.measurement_type.channel,
      label: measurementLabel(row.measurement_type),
      detectors: row.effective_detectors,
    })),
  }));
}
