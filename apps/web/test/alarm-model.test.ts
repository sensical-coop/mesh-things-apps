import assert from "node:assert/strict";
import test from "node:test";
import { type AlarmMeasurement, alarmVariantGroups } from "../src/features/alarm/model.ts";
import { COMPUTED_VARIANT_GROUP } from "../src/features/device/variant-groups.ts";

function measurement(
  id: string,
  variantId: string,
  channel: string,
  origin = "measured",
  detectors: string[] = [],
): AlarmMeasurement {
  return {
    id,
    telemetry_variant_id: variantId,
    measurement_type: { channel, origin, display_name: null },
    effective_detectors: detectors,
  };
}

test("derived channels share one group after the variants the device reports", () => {
  const groups = alarmVariantGroups(
    [
      measurement("m1", "env", "environment_metrics.temperature", "measured", ["range"]),
      measurement("d1", "env", "derived.dew_point", "computed"),
      measurement("m2", "dev", "device_metrics.battery_level"),
      measurement("q", "quality", "quality.completeness_ratio", "computed"),
      measurement("d2", "other", "derived.heat_index", "computed"),
      measurement("m3", "env", "environment_metrics.humidity"),
      measurement("x", "missing", "environment_metrics.iaq"),
    ],
  );
  assert.deepEqual(
    groups.map((group) => [group.key, group.channels.map((channel) => channel.channel)]),
    [
      ["env", ["environment_metrics.temperature", "environment_metrics.humidity"]],
      ["dev", ["device_metrics.battery_level"]],
      ["missing", ["environment_metrics.iaq"]],
      [COMPUTED_VARIANT_GROUP, ["derived.dew_point", "derived.heat_index"]],
    ],
  );
  assert.deepEqual(groups[0]?.channels[0]?.detectors, ["range"]);
});
