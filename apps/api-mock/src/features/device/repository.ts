import { Device, matchesDeviceFilter, type DeviceCreate, type DeviceListFilter } from "@mtt/domain/device/Device";
import type { IDeviceRepository } from "@mtt/domain/device/IDeviceRepository";
import { newId, nowIso } from "@mtt/domain/shared/ids";

export class MemoryDevices implements IDeviceRepository {
  readonly items = new Map<string, Device>();

  async list(filters?: DeviceListFilter): Promise<Device[]> {
    return [...this.items.values()].filter((d) => matchesDeviceFilter(d, filters));
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
      adminKeysB64: [],
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      locationOverridden: false,
      name: input.name ?? null,
      shortName: input.shortName ?? null,
      hardwareType: null,
      role: null,
      nodeinfoOverridden: false,
      postprocessingBlueprintId: null,
      readingIntervalSeconds: null,
      publishIntervalSeconds: null,
      lastSeen: now,
      createdAt: now,
      updatedAt: now,
    });
    this.items.set(device.uuid, device);
    return device;
  }

  async update(
    uuid: string,
    patch: Partial<DeviceCreate> & {
      isAllowed?: boolean;
      postprocessingBlueprintId?: string | null;
      readingIntervalSeconds?: number | null;
      publishIntervalSeconds?: number | null;
      locationOverridden?: boolean;
    },
  ): Promise<Device | null> {
    const device = this.items.get(uuid);
    if (!device) return null;
    if (patch.label !== undefined) device.label = patch.label ?? null;
    if (patch.name !== undefined) device.name = patch.name ?? null;
    if (patch.shortName !== undefined) device.shortName = patch.shortName ?? null;
    if (patch.latitude !== undefined) device.latitude = patch.latitude ?? null;
    if (patch.longitude !== undefined) device.longitude = patch.longitude ?? null;
    if (patch.isAllowed !== undefined) device.isAllowed = patch.isAllowed;
    if (patch.postprocessingBlueprintId !== undefined) {
      device.postprocessingBlueprintId = patch.postprocessingBlueprintId;
    }
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
