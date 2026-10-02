import assert from "node:assert/strict";
import test from "node:test";
import {
  canArchiveDevice,
  awsCliCommand,
  canUseArchive,
  duckdbCommand,
  duckdbExportCommand,
  formatBytes,
  groupByDay,
  partitionDownloadUrl,
  summarizeArchive,
  zipDownloadUrl,
} from "../src/features/archive/model.ts";

const operator = { id: "op", is_superuser: false, role: "operator" as const };
const member = { id: "ada", is_superuser: false, role: "member" as const };
const admin = { id: "admin", is_superuser: true, role: "member" as const };

const credentials = {
  access_key_id: "KEY",
  secret_access_key: "SECRET",
  session_token: "TOKEN",
  expires_at: "2026-09-28T12:00:00Z",
  endpoint: "http://localhost:9000",
  region: "us-east-1",
  bucket: "meshtastic-telemetry",
  prefix: "telemetry/mesh_id=m1/",
  s3_path: "s3://meshtastic-telemetry/telemetry/mesh_id=m1/",
};

test("canUseArchive is the mesh's owner while an operator, or a superuser", () => {
  assert.equal(canUseArchive(operator, "op"), true);
  assert.equal(canUseArchive(operator, "someone"), false);
  assert.equal(canUseArchive(member, "ada"), false);
  assert.equal(canUseArchive(admin, "ada"), true);
  assert.equal(canUseArchive(undefined, "op"), false);
  assert.equal(canUseArchive(operator, undefined), false);
});

test("canArchiveDevice needs the setting in the response", () => {
  assert.equal(canArchiveDevice({ archive_enabled: false }, operator, "op"), true);
  assert.equal(canArchiveDevice({}, operator, "op"), false);
  assert.equal(canArchiveDevice({ archive_enabled: true }, member, "ada"), false);
});

test("summarizeArchive counts files and bytes, oldest to newest", () => {
  assert.deepEqual(summarizeArchive([]), { files: 0, bytes: 0, first: null, last: null });
  assert.deepEqual(
    summarizeArchive([
      { dt: "2026-09-01", hour: 3, size: 100, last_modified: "2026-09-01T03:59:00Z" },
      { dt: "2026-09-02", hour: 14, size: 250, last_modified: "2026-09-02T14:59:00Z" },
    ]),
    { files: 2, bytes: 350, first: "2026-09-01 03:00", last: "2026-09-02 14:00" },
  );
});

test("partitionDownloadUrl points at the readings route", () => {
  assert.equal(
    partitionDownloadUrl("https://api.example.org/", "m1", { dt: "2026-09-02", hour: 4 }),
    "https://api.example.org/readings/archive/meshes/m1/partitions/2026-09-02/4",
  );
});

test("formatBytes picks a unit", () => {
  assert.equal(formatBytes(512, "en"), "512 B");
  assert.equal(formatBytes(1536, "en"), "1.5 KB");
  assert.equal(formatBytes(25 * 1024 * 1024, "en"), "25 MB");
});

test("duckdbCommand fills in credentials, path-style and no TLS on a plain HTTP endpoint", () => {
  const sql = duckdbCommand(credentials, credentials.prefix);
  assert.match(sql, /KEY_ID 'KEY'/);
  assert.match(sql, /SESSION_TOKEN 'TOKEN'/);
  assert.match(sql, /ENDPOINT 'localhost:9000'/);
  assert.match(sql, /URL_STYLE 'path'/);
  assert.match(sql, /USE_SSL false/);
  assert.match(sql, /read_parquet\('s3:\/\/meshtastic-telemetry\/telemetry\/mesh_id=m1\/dt=\*\/hour=\*\/data\.parquet'/);
});

test("duckdbCommand leaves the endpoint to DuckDB on AWS, and uses placeholders before credentials", () => {
  const aws = duckdbCommand({ ...credentials, endpoint: null, region: "eu-west-1" }, credentials.prefix);
  assert.doesNotMatch(aws, /ENDPOINT|URL_STYLE|USE_SSL/);
  assert.match(aws, /REGION 'eu-west-1'/);
  const https = duckdbCommand({ ...credentials, endpoint: "https://s3.api.example.org" }, credentials.prefix);
  assert.match(https, /ENDPOINT 's3.api.example.org'/);
  assert.doesNotMatch(https, /USE_SSL/);
  const template = duckdbCommand(null, "telemetry/mesh_id=m1/");
  assert.match(template, /KEY_ID '<access_key_id>'/);
  assert.match(template, /s3:\/\/<bucket>\/telemetry\/mesh_id=m1\/dt=\*/);
});

test("groupByDay puts the newest day first and adds up each day", () => {
  const days = groupByDay([
    { dt: "2026-09-01", hour: 22, size: 100, last_modified: "2026-09-01T22:59:00Z" },
    { dt: "2026-09-01", hour: 23, size: 50, last_modified: "2026-09-01T23:59:00Z" },
    { dt: "2026-09-02", hour: 0, size: 10, last_modified: "2026-09-02T00:30:00Z" },
  ]);
  assert.deepEqual(
    days.map((day) => [day.dt, day.hours.map((h) => h.hour), day.bytes, day.lastModified]),
    [
      ["2026-09-02", [0], 10, "2026-09-02T00:30:00Z"],
      ["2026-09-01", [22, 23], 150, "2026-09-01T23:59:00Z"],
    ],
  );
  assert.deepEqual(groupByDay([]), []);
});

test("duckdbExportCommand copies every hour into one local file", () => {
  const sql = duckdbExportCommand(credentials, credentials.prefix, "brook.parquet");
  assert.match(sql, /CREATE SECRET archive/);
  assert.match(sql, /COPY \(SELECT \* FROM read_parquet\('s3:\/\/meshtastic-telemetry\/telemetry\/mesh_id=m1\/dt=\*\/hour=\*\/data\.parquet', hive_partitioning = true\) ORDER BY dt, hour\)/);
  assert.match(sql, /TO 'brook\.parquet' \(FORMAT parquet\);/);
});

test("awsCliCommand exports the session and copies the mesh's folder", () => {
  const sh = awsCliCommand(credentials, credentials.prefix, "brook");
  assert.match(sh, /AWS_SESSION_TOKEN='TOKEN'/);
  assert.match(sh, /aws s3 sync 's3:\/\/meshtastic-telemetry\/telemetry\/mesh_id=m1\/' 'brook'/);
  assert.match(sh, /--endpoint-url 'http:\/\/localhost:9000'/);
  assert.doesNotMatch(awsCliCommand({ ...credentials, endpoint: null }, credentials.prefix, "brook"), /endpoint-url/);
  assert.match(awsCliCommand(credentials, credentials.prefix, "it's"), /'it'\\''s'/);
});

test("zipDownloadUrl asks for a range of days, or everything", () => {
  assert.equal(
    zipDownloadUrl("https://api.example.org", "m1", { start: "2026-09-02", stop: "2026-09-02" }),
    "https://api.example.org/readings/archive/meshes/m1/zip?start=2026-09-02&stop=2026-09-02",
  );
  assert.equal(zipDownloadUrl("https://api.example.org/", "m1"), "https://api.example.org/readings/archive/meshes/m1/zip");
});
