import assert from "node:assert/strict";
import test from "node:test";
import type { DeviceRead } from "@mtt/contracts";
import { deviceRoleLabel, deviceTitle } from "../src/features/device/model.ts";

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
  postprocessing_blueprint_id: "00000000-0000-4000-8000-000000000000",
  reading_interval_seconds: 300,
  publish_interval_seconds: 300,
  last_seen: null,
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
