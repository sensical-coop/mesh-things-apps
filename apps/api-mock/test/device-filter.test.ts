import assert from "node:assert/strict";
import test from "node:test";
import { Device } from "@mtt/domain/device/Device";
import { matchesDeviceQuery } from "../src/features/device/filter.ts";

function device(patch: Partial<ConstructorParameters<typeof Device>[0]> = {}) {
  return new Device({
    uuid: "44444444-4444-4444-8444-444444444444",
    nodeId: 1,
    meshId: "11111111-1111-4111-8111-111111111111",
    label: "gw",
    isGateway: true,
    isAllowed: true,
    absenceDetectionEnabled: false,
    adminKeysB64: [],
    latitude: null,
    longitude: null,
    locationOverridden: false,
    name: null,
    shortName: null,
    hardwareType: null,
    role: null,
    nodeinfoOverridden: false,
    postprocessingCount: 0,
    readingIntervalSeconds: null,
    publishIntervalSeconds: null,
    lastSeen: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  });
}

test("list-filter wire matches label, gateway and postprocessing", () => {
  const gw = device();
  assert.equal(matchesDeviceQuery(gw, { extra: [{ field: "label", operator: "contains", values: ["g"] }] }), true);
  assert.equal(matchesDeviceQuery(gw, { extra: [{ field: "is_gateway", operator: "is", values: ["false"] }] }), false);
  assert.equal(
    matchesDeviceQuery(device({ postprocessingCount: 1 }), {
      extra: [{ field: "has_postprocessing", operator: "is", values: ["true"] }],
    }),
    true,
  );
});
