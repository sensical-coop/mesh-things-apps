import assert from "node:assert/strict";
import test from "node:test";
import { chartRangeQuery, customRangeFromDates, defaultChartRange } from "./device-chart-range.ts";

test("preset range omits stop in query", () => {
  const range = defaultChartRange();
  assert.deepEqual(chartRangeQuery(range), { start: "-24h", window: "1h" });
});

test("custom day range maps to ISO start/stop", () => {
  const start = new Date("2024-06-01T00:00:00.000Z");
  const end = new Date("2024-06-08T00:00:00.000Z");
  const mapped = customRangeFromDates(start, end);
  assert.equal(mapped.kind, "custom");
  assert.equal(mapped.start, start.toISOString());
  assert.equal(mapped.stop, end.toISOString());
  assert.equal(mapped.window, "6h");
});

test("custom range swaps inverted dates", () => {
  const start = new Date("2024-06-08T00:00:00.000Z");
  const end = new Date("2024-06-01T00:00:00.000Z");
  const mapped = customRangeFromDates(start, end);
  assert.equal(mapped.start, end.toISOString());
  assert.equal(mapped.stop, start.toISOString());
});
