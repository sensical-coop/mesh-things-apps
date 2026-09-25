import type { Actor } from "@mtt/domain/authz/authz";
import { Device } from "@mtt/domain/device/Device";
import { Mesh } from "@mtt/domain/mesh/Mesh";
import type { MeasurementType } from "@mtt/domain/measurement/Measurement";
import { newId, nowIso } from "@mtt/domain/shared/ids";
import { NIL_BLUEPRINT_ID } from "@mtt/domain/shared/blueprint";
import type { BlueprintRow } from "./features/blueprint/repository";
import { MemoryDevices } from "./features/device/repository";
import { MemoryMeshes } from "./features/mesh/repository";
import { MemoryMeasurements } from "./features/measurement/repository";
import { MemoryReadings } from "./features/readings/repository";

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

export type { BlueprintRow };

export type OwnerVerification = {
  emailVerifiedAt: string | null;
  emailVerificationSentAt: string | null;
};

// Mirrors meshtastic-things' common/detectors.py DETECTOR_SPECS exactly — a
// fixed catalog. "measurement" scoped kinds go in a
// channel's enabled_detectors; the one "device" scoped kind (absence) hangs
// off Device.absence_detection_enabled instead and is deliberately excluded from the
// settable list below.
export type DetectorSpec = {
  name: string;
  scope: "measurement" | "device";
  requires: string[];
  description: string;
};

export const DETECTOR_CATALOG: DetectorSpec[] = [
  {
    name: "flat_value",
    scope: "measurement",
    requires: [],
    description: "Fires when a channel reports the same value for a whole window.",
  },
  {
    name: "range",
    scope: "measurement",
    requires: ["valid_min", "valid_max"],
    description: "Fires when a reading falls outside the range configured for this device.",
  },
  {
    name: "completeness",
    scope: "measurement",
    requires: ["reading_interval_seconds"],
    description: "Fires when a channel's history has gaps against its expected reading interval.",
  },
  {
    name: "absence",
    scope: "device",
    requires: ["publish_interval_seconds"],
    description: "Fires when a device stops publishing for several of its publish intervals.",
  },
];

export const MEASUREMENT_DETECTORS = ["completeness", "flat_value", "range"];

// Catalog-wide state: only a default detector list. valid_min/valid_max are
// purely per-device (see Store.deviceMeasurementRanges below) — there is no
// catalog default to fall back to.
export type TelemetryVariantMeasurementLink = {
  defaultEnabledDetectors: string[];
};

export type DeviceMeasurementRange = {
  validMin: number | null;
  validMax: number | null;
};

export type Store = {
  meshes: MemoryMeshes;
  devices: MemoryDevices;
  measurements: MemoryMeasurements;
  readings: MemoryReadings;
  blueprints: BlueprintRow[];
  actors: Map<string, Actor>;
  verifications: Map<string, OwnerVerification>;
  verificationTokens: Map<string, string>;
  passwordResetTokens: Map<string, { ownerId: string; sentAt: string }>;
  // Per-device-measurement override: null = inherit the catalog default below.
  detectorOverrides: Map<string, string[] | null>;
  // Catalog-wide default per telemetry-variant/measurement link (VARIANT_LINK_ID).
  telemetryVariantMeasurements: Map<string, TelemetryVariantMeasurementLink>;
  // Per-device-measurement range for the "range" detector — purely per-device,
  // no catalog fallback. Keyed by the same id as detectorOverrides.
  deviceMeasurementRanges: Map<string, DeviceMeasurementRange>;
};

export type StoreOwners = {
  adaId?: string;
  boId?: string;
  actors?: Map<string, Actor>;
  verifications?: Map<string, OwnerVerification>;
};

export function createStore(owners: StoreOwners = {}): Store {
  const adaId = owners.adaId ?? OWNER_ID;
  const boId = owners.boId ?? OWNER_BO_ID;
  const actors = owners.actors ?? new Map<string, Actor>();
  const verifications =
    owners.verifications ??
    new Map<string, OwnerVerification>(
      [...actors.values()].map((actor) => [
        actor.id,
        { emailVerifiedAt: actor.createdAt, emailVerificationSentAt: actor.createdAt },
      ]),
    );
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
      // Public so the read-only view of someone else's mesh shows up locally.
      isPublic: true,
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
      absenceDetectionEnabled: true,
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
      absenceDetectionEnabled: true,
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
      absenceDetectionEnabled: true,
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
    readings: new MemoryReadings(devices, meas, new Set([DEVICE_NODE_ID, DEVICE_GW_ID]), t0),
    actors,
    verifications,
    verificationTokens: new Map<string, string>(),
    passwordResetTokens: new Map<string, { ownerId: string; sentAt: string }>(),
    detectorOverrides: new Map<string, string[] | null>(),
    telemetryVariantMeasurements: new Map<string, TelemetryVariantMeasurementLink>([
      [VARIANT_LINK_ID, { defaultEnabledDetectors: ["range"] }],
    ]),
    deviceMeasurementRanges: new Map<string, DeviceMeasurementRange>([
      [DEVICE_MEAS_ID, { validMin: -40, validMax: 85 }],
    ]),
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
