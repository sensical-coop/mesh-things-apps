import assert from "node:assert/strict";
import test from "node:test";
import { availableResolutions } from "../src/pages/devices/detail/chart-resolution.ts";

test("a 24h span offers fine-grained resolutions but not 1 day", () => {
  const values = availableResolutions(86_400_000).map((option) => option.value);
  assert.ok(values.includes("5m"));
  assert.ok(values.includes("1h"));
  assert.ok(!values.includes("1d"));
});

test("a 30 day span excludes resolutions that would yield too many points", () => {
  const values = availableResolutions(30 * 86_400_000).map((option) => option.value);
  assert.ok(!values.includes("1m"));
  assert.ok(!values.includes("5m"));
  assert.ok(values.includes("1d"));
});
