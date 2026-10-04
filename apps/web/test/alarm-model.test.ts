import assert from "node:assert/strict";
import test from "node:test";
import { type AlarmMeasurement, alarmVariantGroups } from "../src/features/alarm/model.ts";

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

test("channels group under their variant, named from the catalog, in API order", () => {
  const groups = alarmVariantGroups(
    [
      measurement("m1", "env", "environment_metrics.temperature", "measured", ["range"]),
      measurement("m2", "dev", "device_metrics.battery_level"),
      measurement("m3", "env", "environment_metrics.humidity"),
    ],
    [
      { id: "env", name: "Environment", payload_kind: "telemetry:environment_metrics" },
      { id: "dev", name: null, payload_kind: "telemetry:device_metrics" },
    ],
  );
  assert.deepEqual(
    groups.map((group) => [group.title, group.channels.map((channel) => channel.channel)]),
    [
      ["Environment", ["environment_metrics.temperature", "environment_metrics.humidity"]],
      ["telemetry:device_metrics", ["device_metrics.battery_level"]],
    ],
  );
  assert.deepEqual(groups[0]?.channels[0]?.detectors, ["range"]);
});

test("quality channels are left out, and a variant missing from the catalog has no title", () => {
  const groups = alarmVariantGroups(
    [
      measurement("q", "quality", "quality.completeness_ratio", "computed"),
      measurement("d", "derived", "derived.dew_point", "computed"),
    ],
    [],
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.title, undefined);
  assert.equal(groups[0]?.channels[0]?.channel, "derived.dew_point");
});
