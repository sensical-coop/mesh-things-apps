import assert from "node:assert/strict";
import test from "node:test";
import { type FormatLabels, formatBytes, formatSecondsAsHms } from "../src/lib/format.ts";

const labels: FormatLabels = {
  neverSeen: "Never seen",
  yes: "Yes",
  no: "No",
  emDash: "—",
  hourUnit: "h",
  minuteUnit: "min",
  secondUnit: "s",
};

test("formatSecondsAsHms splits a duration into hours, minutes, and seconds", () => {
  assert.equal(formatSecondsAsHms(null, labels), "—");
  assert.equal(formatSecondsAsHms(0, labels), "0 s");
  assert.equal(formatSecondsAsHms(45, labels), "45 s");
  assert.equal(formatSecondsAsHms(300, labels), "5 min");
  assert.equal(formatSecondsAsHms(3661, labels), "1 h 1 min 1 s");
});

test("formatBytes picks a unit", () => {
  assert.equal(formatBytes(512, "en"), "512 B");
  assert.equal(formatBytes(1536, "en"), "1.5 KB");
  assert.equal(formatBytes(25 * 1024 * 1024, "en"), "25 MB");
});
