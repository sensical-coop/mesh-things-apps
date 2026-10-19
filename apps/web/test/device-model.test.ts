import assert from "node:assert/strict";
import test from "node:test";
import type { DeviceRead } from "@mtt/contracts";
import {
  deviceLastSeen,
  devicePosition,
  deviceRoleLabel,
  deviceSilent,
  deviceTitle,
  formatNodeId,
  parseCoordinate,
  parseNodeId,
  roundCoordinate,
} from "../src/features/device/model.ts";

const device = {
  uuid: "33333333-3333-4333-8333-333333333333",
  node_id: 1,
  mesh_id: "11111111-1111-4111-8111-111111111111",
  label: "Gateway",
  is_gateway: true,
  is_allowed: true,
  absence_detection_enabled: true,
  admin_keys_b64: [],
  latitude: null,
  longitude: null,
  location_overridden: false,
  name: "Hill GW",
  short_name: "HGW",
  hardware_type: "tbeam",
  role: "ROUTER",
  nodeinfo_overridden: false,
  reading_interval_seconds: 300,
  publish_interval_seconds: 300,
  telemetry_variant_ids: [],
  last_seen: null,
  discovered_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} satisfies DeviceRead;

test("deviceTitle prefers the node name over a role-like label", () => {
  assert.equal(deviceTitle(device), "Hill GW");
});

test("deviceRoleLabel sentence-cases the mesh role", () => {
  assert.equal(deviceRoleLabel(device), "Router");
  assert.equal(deviceRoleLabel({ role: "CLIENT_MUTE", is_gateway: false }), "Client mute");
  assert.equal(deviceRoleLabel({ role: null, is_gateway: true }), "Gateway");
});

test("parseCoordinate keeps decimals whatever the separator", () => {
  assert.deepEqual(parseCoordinate("41.3851", 90), { ok: true, value: 41.3851 });
  assert.deepEqual(parseCoordinate(" 41,3851 ", 90), { ok: true, value: 41.3851 });
  assert.deepEqual(parseCoordinate("-2.17", 180), { ok: true, value: -2.17 });
  assert.deepEqual(parseCoordinate(".5", 90), { ok: true, value: 0.5 });
});

test("parseCoordinate treats blank as no value", () => {
  assert.deepEqual(parseCoordinate("", 90), { ok: true, value: null });
  assert.deepEqual(parseCoordinate("   ", 180), { ok: true, value: null });
});

test("parseCoordinate rejects garbage and out-of-range values", () => {
  assert.deepEqual(parseCoordinate("abc", 90), { ok: false });
  assert.deepEqual(parseCoordinate("1.234.567", 90), { ok: false });
  assert.deepEqual(parseCoordinate("1e3", 180), { ok: false });
  assert.deepEqual(parseCoordinate("90.0001", 90), { ok: false });
  assert.deepEqual(parseCoordinate("-181", 180), { ok: false });
  assert.deepEqual(parseCoordinate("180", 180), { ok: true, value: 180 });
});

test("roundCoordinate trims to six decimals", () => {
  assert.equal(roundCoordinate(41.38512345), 41.385123);
  assert.equal(roundCoordinate(-2.1700004), -2.17);
});

test("parseNodeId reads decimal and hex, with or without the !", () => {
  assert.equal(parseNodeId("2130636288", "decimal"), 2130636288);
  assert.equal(parseNodeId("!7efeee00", "hex"), 2130636288);
  assert.equal(parseNodeId("7EFEEE00", "hex"), 2130636288);
  assert.equal(parseNodeId("0x7efeee00", "hex"), 2130636288);
  assert.equal(parseNodeId(" !ffffffff ", "hex"), 4294967295);
});

test("parseNodeId rejects empty, malformed, and out-of-range ids", () => {
  assert.equal(parseNodeId("", "decimal"), null);
  assert.equal(parseNodeId("!", "hex"), null);
  assert.equal(parseNodeId("!7efeee0g", "hex"), null);
  assert.equal(parseNodeId("!100000000", "hex"), null);
  assert.equal(parseNodeId("4294967296", "decimal"), null);
  assert.equal(parseNodeId("12.5", "decimal"), null);
  assert.equal(parseNodeId("-1", "decimal"), null);
});

test("formatNodeId writes Meshtastic's !hex form", () => {
  assert.equal(formatNodeId(2130636288, "hex"), "!7efeee00");
  assert.equal(formatNodeId(255, "hex"), "!000000ff");
  assert.equal(formatNodeId(255, "decimal"), "255");
});

test("deviceLastSeen falls back to discovery until the gateway's own packets arrive", () => {
  const discovered = { ...device, discovered_at: "2026-01-02T00:00:00Z" };
  assert.equal(deviceLastSeen(discovered), "2026-01-02T00:00:00Z");
  assert.equal(deviceLastSeen({ ...discovered, last_seen: "2026-01-03T00:00:00Z" }), "2026-01-03T00:00:00Z");
  assert.equal(deviceLastSeen(device), null);
});

test("deviceSilent counts a just discovered gateway as heard", () => {
  const now = Date.parse("2026-01-02T00:01:00Z");
  assert.equal(deviceSilent(device, now), true);
  assert.equal(deviceSilent({ ...device, discovered_at: "2026-01-02T00:00:00Z" }, now), false);
});

test("devicePosition drops missing and out-of-range coordinates", () => {
  assert.deepEqual(devicePosition({ latitude: 41.38, longitude: 2.17 }), [2.17, 41.38]);
  assert.equal(devicePosition({ latitude: null, longitude: 2.17 }), null);
  assert.equal(devicePosition({ latitude: 413_851_000, longitude: 21_734_000 }), null);
  assert.equal(devicePosition({ latitude: 41.38, longitude: 190 }), null);
  assert.equal(devicePosition({ latitude: Number.NaN, longitude: 2.17 }), null);
});
