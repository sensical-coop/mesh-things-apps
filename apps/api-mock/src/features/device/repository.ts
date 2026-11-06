import { Device, type DeviceCreate } from "@mtt/domain/device/Device";
import type { DevicePatch, IDeviceRepository } from "@mtt/domain/device/IDeviceRepository";
import { type DeviceListQuery, matchesDeviceQuery } from "./filter";
import { newId, nowIso } from "@mtt/domain/shared/ids";

/** POST gateways stay unseen until this elapses. 0 never marks them seen. Seed data does not use insert(). */
function gatewaySeenAfterMs(): number {
  const raw = process.env.MOCK_GATEWAY_SEEN_AFTER_MS;
  if (raw === undefined || raw === "") return 20_000;
  const ms = Number(raw);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

export class MemoryDevices implements IDeviceRepository {
  readonly items = new Map<string, Device>();

  async list(filters?: DeviceListQuery): Promise<Device[]> {
    return [...this.items.values()].filter((d) => matchesDeviceQuery(d, filters));
  }

  async get(uuid: string): Promise<Device | null> {
    return this.items.get(uuid) ?? null;
  }

  async insert(input: DeviceCreate): Promise<Device> {
    const now = nowIso();
    const device = new Device({
      uuid: newId(),
      nodeId: input.nodeId,
      meshId: input.meshId,
      label: input.label ?? null,
      isGateway: input.isGateway,
      isAllowed: true,
      absenceDetectionEnabled: false, // registry default: off until the owner sets a publish interval
      adminKeysB64: [],
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      locationOverridden: false,
      name: input.name ?? null,
      shortName: input.shortName ?? null,
      hardwareType: null,
      role: null,
      nodeinfoOverridden: false,
      postprocessingCount: 0,
      readingIntervalSeconds: null,
      publishIntervalSeconds: null,
      lastSeen: input.isGateway ? null : now,
      createdAt: now,
      updatedAt: now,
    });
    this.items.set(device.uuid, device);
    const seenAfter = input.isGateway ? gatewaySeenAfterMs() : 0;
    if (seenAfter > 0) {
      const timer = setTimeout(() => {
        const current = this.items.get(device.uuid);
        if (!current || current.lastSeen) return;
        const seen = nowIso();
        current.lastSeen = seen;
        current.updatedAt = seen;
        const taken = new Set([...this.items.values()].filter((d) => d.meshId === current.meshId).map((d) => d.nodeId));
        let nodeId = current.nodeId;
        for (let i = 1; i <= 2; i++) {
          do nodeId = (nodeId + 1) % 0x1_0000_0000;
          while (taken.has(nodeId));
          taken.add(nodeId);
          const node = new Device({
            uuid: newId(),
            nodeId,
            meshId: current.meshId,
            label: null,
            isGateway: false,
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
            lastSeen: seen,
            createdAt: seen,
            updatedAt: seen,
          });
          this.items.set(node.uuid, node);
        }
      }, seenAfter);
      timer.unref?.();
    }
    return device;
  }

  async update(uuid: string, patch: DevicePatch): Promise<Device | null> {
    const device = this.items.get(uuid);
    if (!device) return null;
    if (patch.label !== undefined) device.label = patch.label ?? null;
    if (patch.name !== undefined) device.name = patch.name ?? null;
    if (patch.shortName !== undefined) device.shortName = patch.shortName ?? null;
    if (patch.latitude !== undefined) device.latitude = patch.latitude ?? null;
    if (patch.longitude !== undefined) device.longitude = patch.longitude ?? null;
    if (patch.isAllowed !== undefined) device.isAllowed = patch.isAllowed;
    if (patch.isGateway !== undefined) device.isGateway = patch.isGateway;
    if (patch.absenceDetectionEnabled !== undefined) device.absenceDetectionEnabled = patch.absenceDetectionEnabled;
    if (patch.readingIntervalSeconds !== undefined) {
      device.readingIntervalSeconds = patch.readingIntervalSeconds;
    }
    if (patch.publishIntervalSeconds !== undefined) {
      device.publishIntervalSeconds = patch.publishIntervalSeconds;
    }
    if (patch.locationOverridden !== undefined) device.locationOverridden = patch.locationOverridden;
    device.updatedAt = nowIso();
    return device;
  }

  async delete(uuid: string): Promise<boolean> {
    return this.items.delete(uuid);
  }
}
