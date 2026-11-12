import assert from "node:assert/strict";
import test from "node:test";
import {
  chartRangeQuery,
  customRangeFromDates,
  defaultChartRange,
  windowForSpanMs,
} from "../src/pages/devices/detail/chart-range.ts";

test("preset range has no stop in its query", () => {
  assert.equal("stop" in chartRangeQuery(defaultChartRange()), false);
});

test("custom day range maps to ISO start/stop", () => {
  const mapped = customRangeFromDates(new Date("2024-06-01T00:00:00.000Z"), new Date("2024-06-08T00:00:00.000Z"));
  assert.equal(mapped.kind, "custom");
  assert.equal(mapped.start, "2024-06-01T00:00:00.000Z");
  assert.equal(mapped.stop, "2024-06-08T00:00:00.000Z");
  assert.equal(mapped.spanMs, 604_800_000);
});

test("windowForSpanMs picks a coarser bucket for longer spans", () => {
  assert.equal(windowForSpanMs(2 * 86_400_000), "1h");
  assert.equal(windowForSpanMs(2 * 86_400_000 + 1), "6h");
  assert.equal(windowForSpanMs(14 * 86_400_000), "6h");
  assert.equal(windowForSpanMs(14 * 86_400_000 + 1), "1d");
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
