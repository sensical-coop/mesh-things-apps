import assert from "node:assert/strict";
import test from "node:test";
import { formatSecondsAsHms } from "../src/lib/format.ts";

test("formatSecondsAsHms splits a duration into hours, minutes, and seconds", () => {
  assert.equal(formatSecondsAsHms(null), "—");
  assert.equal(formatSecondsAsHms(0), "0 s");
  assert.equal(formatSecondsAsHms(45), "45 s");
  assert.equal(formatSecondsAsHms(300), "5 min");
  assert.equal(formatSecondsAsHms(3661), "1 h 1 min 1 s");
});
