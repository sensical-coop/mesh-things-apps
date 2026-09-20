import assert from "node:assert/strict";
import test from "node:test";
import {
  chartRangeQuery,
  customRangeFromDates,
  defaultChartRange,
  windowForSpanMs,
} from "../src/pages/devices/detail/chart-range.ts";

test("preset range omits stop in query", () => {
  const range = defaultChartRange();
  assert.deepEqual(chartRangeQuery(range), { start: "-24h" });
  assert.equal(range.spanMs, 86_400_000);
});

test("custom day range maps to ISO start/stop", () => {
  const start = new Date("2024-06-01T00:00:00.000Z");
  const end = new Date("2024-06-08T00:00:00.000Z");
  const mapped = customRangeFromDates(start, end);
  assert.equal(mapped.kind, "custom");
  assert.equal(mapped.start, start.toISOString());
  assert.equal(mapped.stop, end.toISOString());
  assert.equal(mapped.spanMs, end.getTime() - start.getTime());
  assert.equal(windowForSpanMs(mapped.spanMs), "6h");
});

test("windowForSpanMs picks a coarser bucket for longer spans", () => {
  assert.equal(windowForSpanMs(3_600_000), "1h");
  assert.equal(windowForSpanMs(7 * 86_400_000), "6h");
  assert.equal(windowForSpanMs(30 * 86_400_000), "1d");
});

test("custom range swaps inverted dates", () => {
  const start = new Date("2024-06-08T00:00:00.000Z");
  const end = new Date("2024-06-01T00:00:00.000Z");
  const mapped = customRangeFromDates(start, end);
  assert.equal(mapped.kind, "custom");
  if (mapped.kind !== "custom") return;
  assert.equal(mapped.start, end.toISOString());
  assert.equal(mapped.stop, start.toISOString());
});
