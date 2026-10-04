import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPORT_MAX_DAYS,
  daysInRange,
  isActive,
  lastDays,
  pollInterval,
  progressOf,
  rangeProblem,
  requestOf,
  shiftDay,
} from "../src/features/export/model.ts";

test("daysInRange counts both ends", () => {
  assert.equal(daysInRange("2026-09-01", "2026-09-01"), 1);
  assert.equal(daysInRange("2026-02-27", "2026-03-02"), 4);
});

test("shiftDay moves across months in UTC", () => {
  assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
});

test("lastDays ends today and covers that many days", () => {
  const range = lastDays(7, new Date("2026-10-04T23:30:00Z"));
  assert.deepEqual(range, { start: "2026-09-28", stop: "2026-10-04" });
});

test("rangeProblem refuses what the API would", () => {
  assert.equal(rangeProblem("", "2026-09-01"), "missing");
  assert.equal(rangeProblem("2026-09-02", "2026-09-01"), "reversed");
  assert.equal(rangeProblem("2025-01-01", shiftDay("2025-01-01", EXPORT_MAX_DAYS)), "tooLong");
  assert.equal(rangeProblem("2025-01-01", shiftDay("2025-01-01", EXPORT_MAX_DAYS - 1)), null);
});

test("requestOf repeats a download, with its devices only when it had some", () => {
  assert.deepEqual(requestOf({ format: "csv", start: "2026-09-01", stop: "2026-09-02", node_ids: [7, 10] }), {
    format: "csv",
    start: "2026-09-01",
    stop: "2026-09-02",
    node_ids: [7, 10],
  });
  assert.deepEqual(requestOf({ format: "parquet", start: "2026-09-01", stop: "2026-09-01", node_ids: null }), {
    format: "parquet",
    start: "2026-09-01",
    stop: "2026-09-01",
  });
});

test("polling runs only while something is being prepared", () => {
  assert.equal(pollInterval([{ status: "ready" }, { status: "expired" }]), false);
  assert.equal(pollInterval([{ status: "ready" }, { status: "running" }]), 3000);
  assert.equal(pollInterval(undefined), false);
  assert.equal(isActive("queued"), true);
  assert.equal(isActive("failed"), false);
});

test("progressOf stays within 0 and 1", () => {
  assert.equal(progressOf({ days_done: 3, days_total: 4 }), 0.75);
  assert.equal(progressOf({ days_done: 0, days_total: 0 }), 0);
});
