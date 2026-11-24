import { describe, expect, it } from "vitest";
import { Device } from "../../src/device/Device";

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
    readingIntervalSeconds: null,
    publishIntervalSeconds: null,
    lastSeen: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  });
}

describe("Device", () => {
  it("records who switched the archive on, and clears it when switched off", () => {
    const device = makeDevice();
    expect(device.archiveEnabled).toBe(false);
    device.setArchive(true, "op", "2026-09-01T00:00:00.000Z");
    expect([device.archiveEnabled, device.archiveEnabledBy, device.archiveEnabledAt]).toEqual([
      true,
      "op",
      "2026-09-01T00:00:00.000Z",
    ]);
    // Switching it on again keeps the first record.
    device.setArchive(true, "admin", "2026-09-02T00:00:00.000Z");
    expect(device.archiveEnabledBy).toBe("op");
    device.setArchive(false, "op", "2026-09-03T00:00:00.000Z");
    expect([device.archiveEnabled, device.archiveEnabledBy, device.archiveEnabledAt]).toEqual([false, null, null]);
  });
});
