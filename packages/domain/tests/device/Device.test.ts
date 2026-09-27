import { describe, expect, it } from "vitest";
import { Device, matchesDeviceFilter } from "../../src/device/Device";

function makeDevice(over: Partial<ConstructorParameters<typeof Device>[0]> = {}): Device {
  return new Device({
    uuid: "33333333-3333-4333-8333-333333333333",
    nodeId: 1,
    meshId: "11111111-1111-4111-8111-111111111111",
    label: "gw",
    isGateway: true,
    isAllowed: true,
    absenceDetectionEnabled: true,
    adminKeysB64: [],
    latitude: null,
    longitude: null,
    locationOverridden: false,
    name: "GW",
    shortName: "GW",
    hardwareType: "tbeam",
    role: "CLIENT",
    nodeinfoOverridden: false,
    postprocessingCount: 0,
    readingIntervalSeconds: null,
    publishIntervalSeconds: null,
    lastSeen: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  });
}

describe("Device", () => {
  it("keeps nodeId and meshId readonly after create", () => {
    const device = makeDevice();
    expect(device.nodeId).toBe(1);
    expect(() => {
      // @ts-expect-error nodeId is frozen after create
      device.nodeId = 99;
    }).toThrow();
  });

  it("filters gateways on one mesh", () => {
    const gw = makeDevice({ isGateway: true });
    const node = makeDevice({
      uuid: "44444444-4444-4444-8444-444444444444",
      nodeId: 2,
      isGateway: false,
    });
    expect(matchesDeviceFilter(gw, { meshId: gw.meshId, isGateway: true })).toBe(true);
    expect(matchesDeviceFilter(node, { meshId: gw.meshId, isGateway: true })).toBe(false);
    expect(
      matchesDeviceFilter(gw, {
        extra: [{ field: "label", operator: "contains", values: ["g"] }],
      }),
    ).toBe(true);
    expect(
      matchesDeviceFilter(gw, {
        extra: [{ field: "is_gateway", operator: "is", values: ["false"] }],
      }),
    ).toBe(false);
  });

  it("has postprocessing once a blueprint is attached", () => {
    expect(makeDevice().hasPostprocessing()).toBe(false);
    expect(makeDevice({ postprocessingCount: 2 }).hasPostprocessing()).toBe(true);
    expect(
      matchesDeviceFilter(makeDevice({ postprocessingCount: 1 }), {
        extra: [{ field: "has_postprocessing", operator: "is", values: ["true"] }],
      }),
    ).toBe(true);
  });
});
