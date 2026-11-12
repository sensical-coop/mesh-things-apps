import assert from "node:assert/strict";
import test from "node:test";
import { isChartableMeasurement, isDerivedMeasurement, measurementLabel } from "../src/lib/measurement.ts";

test("derived channels chart, quality ones don't — both come with origin computed", () => {
  assert.equal(isChartableMeasurement({ origin: "computed", channel: "derived.dew_point" }), true);
  assert.equal(isChartableMeasurement({ origin: "computed", channel: "quality.completeness_ratio" }), false);
  assert.equal(isChartableMeasurement({ origin: "measured", channel: "environment_metrics.temperature" }), true);
  assert.equal(isDerivedMeasurement({ channel: "derived.no2_ppb" }), true);
  assert.equal(isDerivedMeasurement({ channel: "quality.completeness_ratio" }), false);
});

test("a channel is named by its display name, else its short name", () => {
  assert.equal(measurementLabel({ channel: "environment_metrics.temperature", display_name: "Temperature" }), "Temperature");
  assert.equal(measurementLabel({ channel: "environment_metrics.temperature", display_name: null }), "temperature");
});
