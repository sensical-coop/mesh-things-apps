import type { Actor } from "@mtt/domain/authz/authz";
import { Device, matchesDeviceFilter, type DeviceCreate, type DeviceListFilter } from "@mtt/domain/device/Device";
import type { IDeviceRepository } from "@mtt/domain/device/IDeviceRepository";
import { Mesh, meshFilterValue } from "@mtt/domain/mesh/Mesh";
import type { MeshCreate } from "@mtt/domain/mesh/Mesh";
import type { IMeshRepository } from "@mtt/domain/mesh/IMeshRepository";
import type { IMeasurementRepository, MeasurementType } from "@mtt/domain/measurement/Measurement";
import type { IReadingsRepository, LatestReading, SeriesQuery } from "@mtt/domain/readings/Readings";
import { newId, nowIso } from "@mtt/domain/shared/ids";
import { NIL_BLUEPRINT_ID } from "@mtt/domain/shared/blueprint";
import { matchesListFilters, type ListFilter } from "@mtt/domain/shared/list-filter";

export const OWNER_ID = "22222222-2222-4222-8222-222222222222";
export const OWNER_BO_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
export const OWNER_ADMIN_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
export const OWNER_STAFF_ID = "12121212-1212-4121-8121-121212121212";
export const MESH_HILL_ID = "11111111-1111-4111-8111-111111111111";
export const MESH_RIVER_ID = "55555555-5555-4555-8555-555555555555";
export const DEVICE_GW_ID = "33333333-3333-4333-8333-333333333333";
export const DEVICE_NODE_ID = "44444444-4444-4444-8444-444444444444";
export const DEVICE_RIVER_GW_ID = "13131313-1313-4131-8131-131313131313";
export const MEAS_TEMP_ID = "66666666-6666-4666-8666-666666666666";
export const VARIANT_ENV_ID = "77777777-7777-4777-8777-777777777777";
export const DEVICE_MEAS_ID = "88888888-8888-4888-8888-888888888888";
export const DEVICE_VARIANT_ID = "99999999-9999-4999-8999-999999999999";
export const MEAS_DEW_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const MEAS_GAP_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const BLUEPRINT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const VARIANT_LINK_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const OWNER_EMAIL = "owner@sensical.test";
export const OWNER_PASSWORD = "mesh-owner-12";
export const OWNER_BO_EMAIL = "river@sensical.test";
export const OWNER_BO_PASSWORD = "mesh-owner-12";
export const OWNER_ADMIN_EMAIL = "admin@sensical.test";
export const OWNER_ADMIN_PASSWORD = "mesh-admin-12";
export const OWNER_STAFF_EMAIL = "staff@sensical.test";
export const OWNER_STAFF_PASSWORD = "mesh-staff-12";

const t0 = "2026-01-01T00:00:00.000Z";

export class MemoryMeshes implements IMeshRepository {
  readonly items = new Map<string, Mesh>();

  async list(filters?: ListFilter[]): Promise<Mesh[]> {
    const items = [...this.items.values()];
    if (!filters?.length) return items;
    return items.filter((mesh) => matchesListFilters((field) => meshFilterValue(mesh, field), filters));
  }

  async get(id: string): Promise<Mesh | null> {
    return this.items.get(id) ?? null;
  }

  async insert(input: MeshCreate): Promise<Mesh> {
    const now = nowIso();
    const mesh = new Mesh({
      id: newId(),
      channelId: input.channelId,
      pskB64: input.pskB64,
      label: input.label ?? null,
      ownerId: input.ownerId,
      createdAt: now,
      updatedAt: now,
    });
    this.items.set(mesh.id, mesh);
    return mesh;
  }
}

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

  async update(uuid: string, patch: Partial<DeviceCreate> & {
    isAllowed?: boolean;
    postprocessingBlueprintId?: string | null;
    readingIntervalSeconds?: number | null;
    publishIntervalSeconds?: number | null;
    locationOverridden?: boolean;
  }): Promise<Device | null> {
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
}

export class MemoryMeasurements implements IMeasurementRepository {
  constructor(private readonly rows: MeasurementType[]) {}

  async list(): Promise<MeasurementType[]> {
    return this.rows;
  }
}

export class MemoryReadings implements IReadingsRepository {
  constructor(
    private readonly devices: MemoryDevices,
    private readonly measurements: MeasurementType[],
  ) {}

  async latest(deviceUuid: string): Promise<LatestReading[]> {
    const device = await this.devices.get(deviceUuid);
    if (!device) return [];
    if (device.uuid !== DEVICE_NODE_ID && device.uuid !== DEVICE_GW_ID) return [];
    return this.measurements.map((m, i) => ({
      payloadKind: m.payloadKind,
      fieldName: m.fieldName,
      channel: m.channel,
      value: i === 0 ? 21.4 : i === 1 ? 8.1 : 0.91,
      time: t0,
      unit: m.nativeUnit,
      quantityKind: m.quantityKind,
      vocabularyUri: m.vocabularyUri,
      origin: m.origin,
    }));
  }

  async series(deviceUuid: string, query: SeriesQuery) {
    const device = await this.devices.get(deviceUuid);
    if (!device) {
      return { payloadKind: query.payloadKind ?? "environmentmetrics", series: [] };
    }
    const temp = this.measurements[0];
    const channel = query.channel ?? temp?.channel ?? "environmentmetrics.temperature";
    const payloadKind = query.payloadKind ?? channel.split(".")[0] ?? "environmentmetrics";
    const points = Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.parse(t0) + i * 3600_000).toISOString(),
      value: 18 + Math.sin(i / 3) * 3,
    }));
    return { payloadKind, series: [{ channel, points }] };
  }
}

export type BlueprintRow = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  steps: { id: string; order: number; function_name: string; inputs: unknown; params: unknown; outputs: unknown }[];
  createdAt: string;
  updatedAt: string;
};

export type Store = {
  meshes: MemoryMeshes;
  devices: MemoryDevices;
  measurements: MemoryMeasurements;
  readings: MemoryReadings;
  blueprints: BlueprintRow[];
  actors: Map<string, Actor>;
};

export type StoreOwners = {
  adaId?: string;
  boId?: string;
  actors?: Map<string, Actor>;
};

export function createStore(owners: StoreOwners = {}): Store {
  const adaId = owners.adaId ?? OWNER_ID;
  const boId = owners.boId ?? OWNER_BO_ID;
  const actors = owners.actors ?? new Map<string, Actor>();
  const meas: MeasurementType[] = [
    {
      id: MEAS_TEMP_ID,
      payloadKind: "environmentmetrics",
      fieldName: "temperature",
      channel: "environmentmetrics.temperature",
      origin: "measured",
      displayName: "Temperature",
      description: "Air temperature",
      nativeUnit: "Cel",
      quantityKind: "physical_property",
      vocabularyUri: "https://vocab.nerc.ac.uk/collection/P07/current/CFSN0023/",
      createdAt: t0,
      updatedAt: t0,
    },
    {
      id: MEAS_DEW_ID,
      payloadKind: "derived",
      fieldName: "dew_point",
      channel: "derived.dew_point",
      origin: "derived",
      displayName: "Dew point",
      description: null,
      nativeUnit: "Cel",
      quantityKind: "physical_property",
      vocabularyUri: null,
      createdAt: t0,
      updatedAt: t0,
    },
    {
      id: MEAS_GAP_ID,
      payloadKind: "quality",
      fieldName: "completeness_ratio",
      channel: "quality.completeness_ratio",
      origin: "quality",
      displayName: "Completeness",
      description: null,
      nativeUnit: "ratio",
      quantityKind: "ratio",
      vocabularyUri: null,
      createdAt: t0,
      updatedAt: t0,
    },
  ];
  const meshes = new MemoryMeshes();
  meshes.items.set(
    MESH_HILL_ID,
    new Mesh({
      id: MESH_HILL_ID,
      channelId: "LongFast",
      pskB64: "c2VjcmV0SGlsbA==",
      label: "Hill",
      ownerId: adaId,
      createdAt: t0,
      updatedAt: t0,
    }),
  );
  meshes.items.set(
    MESH_RIVER_ID,
    new Mesh({
      id: MESH_RIVER_ID,
      channelId: "LongFast",
      pskB64: "c2VjcmV0Uml2ZXI=",
      label: "River",
      ownerId: boId,
      createdAt: t0,
      updatedAt: t0,
    }),
  );
  const devices = new MemoryDevices();
  devices.items.set(
    DEVICE_GW_ID,
    new Device({
      uuid: DEVICE_GW_ID,
      nodeId: 1,
      meshId: MESH_HILL_ID,
      label: "Gateway",
      isGateway: true,
      isAllowed: true,
      adminKeysB64: [],
      latitude: 41.38,
      longitude: 2.17,
      locationOverridden: false,
      name: "Hill GW",
      shortName: "HGW",
      hardwareType: "tbeam",
      role: "ROUTER",
      nodeinfoOverridden: false,
      postprocessingBlueprintId: null,
      readingIntervalSeconds: 300,
      publishIntervalSeconds: 300,
      lastSeen: nowIso(),
      createdAt: t0,
      updatedAt: t0,
    }),
  );
  devices.items.set(
    DEVICE_NODE_ID,
    new Device({
      uuid: DEVICE_NODE_ID,
      nodeId: 2,
      meshId: MESH_HILL_ID,
      label: "Porch",
      isGateway: false,
      isAllowed: true,
      adminKeysB64: [],
      latitude: 41.381,
      longitude: 2.171,
      locationOverridden: false,
      name: "Porch",
      shortName: "PRC",
      hardwareType: "heltec",
      role: "CLIENT",
      nodeinfoOverridden: false,
      postprocessingBlueprintId: BLUEPRINT_ID,
      readingIntervalSeconds: 300,
      publishIntervalSeconds: 300,
      lastSeen: nowIso(),
      createdAt: t0,
      updatedAt: t0,
    }),
  );
  devices.items.set(
    DEVICE_RIVER_GW_ID,
    new Device({
      uuid: DEVICE_RIVER_GW_ID,
      nodeId: 1,
      meshId: MESH_RIVER_ID,
      label: "River gateway",
      isGateway: true,
      isAllowed: true,
      adminKeysB64: [],
      latitude: 41.39,
      longitude: 2.16,
      locationOverridden: false,
      name: "River GW",
      shortName: "RGW",
      hardwareType: "tbeam",
      role: "ROUTER",
      nodeinfoOverridden: false,
      postprocessingBlueprintId: null,
      readingIntervalSeconds: 300,
      publishIntervalSeconds: 300,
      lastSeen: nowIso(),
      createdAt: t0,
      updatedAt: t0,
    }),
  );
  const measurements = new MemoryMeasurements(meas);
  return {
    meshes,
    devices,
    measurements,
    readings: new MemoryReadings(devices, meas),
    actors,
    blueprints: [
      {
        id: BLUEPRINT_ID,
        name: "Dew point",
        description: "Temperature + RH",
        ownerId: adaId,
        steps: [
          {
            id: newId(),
            order: 1,
            function_name: "dew_point",
            inputs: { temperature: "environmentmetrics.temperature", relative_humidity: "environmentmetrics.relative_humidity" },
            params: {},
            outputs: { dew_point: "derived.dew_point" },
          },
        ],
        createdAt: t0,
        updatedAt: t0,
      },
    ],
  };
}

export { NIL_BLUEPRINT_ID };
