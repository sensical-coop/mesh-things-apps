import assert from "node:assert/strict";
import test from "node:test";
import { channelShortName, isChartableMeasurement, isDerivedMeasurement } from "../src/lib/measurement.ts";

test("derived channels chart, quality ones don't — both come with origin computed", () => {
  assert.equal(isChartableMeasurement({ origin: "computed", channel: "derived.dew_point" }), true);
  assert.equal(isChartableMeasurement({ origin: "computed", channel: "quality.completeness_ratio" }), false);
  assert.equal(isChartableMeasurement({ origin: "measured", channel: "environment_metrics.temperature" }), true);
  assert.equal(isDerivedMeasurement({ channel: "derived.no2_ppb" }), true);
});

test("charts use the card's short name", () => {
  assert.equal(channelShortName("environment_metrics.temperature"), "temperature");
  assert.equal(channelShortName("derived.dew_point"), "dew_point");
  assert.equal(channelShortName("plain"), "plain");
});
