import assert from "node:assert/strict";
import test from "node:test";
import { fillTimeGaps, parseWindowMs } from "../src/components/series/fill-gaps.ts";

test("parseWindowMs reads number+unit windows", () => {
  assert.equal(parseWindowMs("1h"), 3_600_000);
  assert.equal(parseWindowMs("6h"), 21_600_000);
  assert.equal(parseWindowMs("1d"), 86_400_000);
  assert.equal(parseWindowMs("30m"), 1_800_000);
  assert.equal(parseWindowMs("bogus"), null);
});

test("fillTimeGaps leaves evenly spaced points untouched", () => {
  const points = [
    { time: "2024-06-01T00:00:00.000Z", value: 1 },
    { time: "2024-06-01T01:00:00.000Z", value: 2 },
    { time: "2024-06-01T02:00:00.000Z", value: 3 },
  ];
  assert.deepEqual(fillTimeGaps(points, 3_600_000), points);
});

test("fillTimeGaps inserts null placeholders across an outlier gap in an otherwise-regular series", () => {
  const points = [
    { time: "2024-06-01T00:00:00.000Z", value: 1 },
    { time: "2024-06-01T01:00:00.000Z", value: 2 },
    { time: "2024-06-01T10:00:00.000Z", value: 3 },
    { time: "2024-06-01T11:00:00.000Z", value: 4 },
  ];
  const filled = fillTimeGaps(points, 3_600_000);
  assert.equal(filled.length, 12);
  assert.equal(filled.at(0)?.value, 1);
  assert.equal(filled.at(1)?.value, 2);
  assert.equal(filled.at(-2)?.value, 3);
  assert.equal(filled.at(-1)?.value, 4);
  for (const row of filled.slice(2, -2)) {
    assert.equal(row.value, null);
  }
  assert.equal(filled.at(2)?.time, "2024-06-01T02:00:00.000Z");
  assert.equal(filled.at(9)?.time, "2024-06-01T09:00:00.000Z");
});

test("fillTimeGaps is a no-op with too few points to infer a natural cadence", () => {
  const points = [
    { time: "2024-06-01T01:00:00.000Z", value: 1 },
    { time: "2024-06-01T10:00:00.000Z", value: 2 },
  ];
  assert.deepEqual(fillTimeGaps(points, null), points);
  assert.deepEqual(fillTimeGaps(points, 3_600_000), points);
});

test("fillTimeGaps does not pad gaps when the requested resolution is finer than the device's real cadence", () => {
  // Real device reports every 10 minutes; the user asked for a 1-minute
  // resolution. Every normal gap is "large" relative to that request, but
  // it must not be treated as missing data — the series' own cadence wins.
  const points = [
    { time: "2024-06-01T00:00:00.000Z", value: 1 },
    { time: "2024-06-01T00:10:00.000Z", value: 2 },
    { time: "2024-06-01T00:20:00.000Z", value: 3 },
    { time: "2024-06-01T00:30:00.000Z", value: 4 },
  ];
  assert.deepEqual(fillTimeGaps(points, 60_000), points);
});
