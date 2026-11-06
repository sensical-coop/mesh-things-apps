import assert from "node:assert/strict";
import test from "node:test";
import { formatBytes, formatSecondsAsHms } from "../src/lib/format.ts";

test("formatSecondsAsHms splits a duration into hours, minutes, and seconds", () => {
  assert.equal(formatSecondsAsHms(null), "—");
  assert.equal(formatSecondsAsHms(0), "0 s");
  assert.equal(formatSecondsAsHms(45), "45 s");
  assert.equal(formatSecondsAsHms(300), "5 min");
  assert.equal(formatSecondsAsHms(3661), "1 h 1 min 1 s");
});

test("formatBytes picks a unit", () => {
  assert.equal(formatBytes(512, "en"), "512 B");
  assert.equal(formatBytes(1536, "en"), "1.5 KB");
  assert.equal(formatBytes(25 * 1024 * 1024, "en"), "25 MB");
});
