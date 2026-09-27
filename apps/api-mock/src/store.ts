import type { Actor } from "@mtt/domain/authz/authz";
import { Device } from "@mtt/domain/device/Device";
import { Mesh } from "@mtt/domain/mesh/Mesh";
import type { MeasurementType } from "@mtt/domain/measurement/Measurement";
import { newId, nowIso } from "@mtt/domain/shared/ids";
import type { BlueprintRow, BlueprintVersionRow } from "./features/blueprint/repository";
import type { BackfillRow, CalibrationRow, PostprocessingRow } from "./features/postprocessing/repository";
import { MemoryDevices } from "./features/device/repository";
import { MemoryMeshes } from "./features/mesh/repository";
import { MemoryMeasurements } from "./features/measurement/repository";
import { MemoryReadings } from "./features/readings/repository";
import { MemorySources } from "./features/source/repository";
import {
  DATA_RETENTION_DAYS,
  TERMS_ENFORCED,
  TERMS_VERSIONS,
  type TermsAcceptance,
} from "./features/terms/terms";
import type { OperatorRequestRow } from "./features/operator-request/repository";
import type { DataDeletionRow } from "./features/data-deletion/repository";

export const OWNER_ID = "22222222-2222-4222-8222-222222222222";
export const OWNER_BO_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
export const OWNER_ADMIN_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
export const OWNER_STAFF_ID = "12121212-1212-4121-8121-121212121212";
export const OWNER_OPERATOR_ID = "14141414-1414-4141-8141-141414141414";
export const MESH_HILL_ID = "11111111-1111-4111-8111-111111111111";
export const MESH_RIVER_ID = "55555555-5555-4555-8555-555555555555";
export const MESH_BRIDGED_ID = "15151515-1515-4151-8151-151515151515";
export const SOURCE_PUBLIC_ID = "16161616-1616-4161-8161-161616161616";
export const OPERATOR_REQUEST_BO_ID = "17171717-1717-4171-8171-171717171717";
/** A mesh deleted before the seed: its readings are what the seeded deletions remove. */
export const MESH_GONE_ID = "18181818-1818-4181-8181-181818181818";
/** One mesh per Status column state, so the colours can be checked at a glance. */
export const SOURCE_OFFLINE_ID = "20202020-2020-4202-8202-202020202020";
export const SOURCE_LAPSED_ID = "21212121-2121-4212-8212-212121212121";
export const DEVICE_GW_ID = "33333333-3333-4333-8333-333333333333";
export const DEVICE_NODE_ID = "44444444-4444-4444-8444-444444444444";
export const DEVICE_RIVER_GW_ID = "13131313-1313-4131-8131-131313131313";
export const MEAS_TEMP_ID = "66666666-6666-4666-8666-666666666666";
export const VARIANT_ENV_ID = "77777777-7777-4777-8777-777777777777";
export const DEVICE_MEAS_ID = "88888888-8888-4888-8888-888888888888";
/** The Porch node's channel for the catalog row at `index`. */
export function deviceMeasurementId(index: number): string {
  return index === 0 ? DEVICE_MEAS_ID : `${DEVICE_MEAS_ID.slice(0, -1)}${index}`;
}
export const DEVICE_VARIANT_ID = "99999999-9999-4999-8999-999999999999";
export const MEAS_DEW_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const MEAS_GAP_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const BLUEPRINT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const BLUEPRINT_NO2_ID = "23232323-2323-4232-8232-232323232323";
export const MEAS_RH_ID = "24242424-2424-4242-8242-242424242424";
export const POSTPROCESSING_DEW_ID = "25252525-2525-4252-8252-252525252525";
/** The dew point channel the seeded postprocessing registers on the Porch node. */
export const DEVICE_DEW_MEAS_ID = "26262626-2626-4262-8262-262626262626";
export const VARIANT_LINK_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const OWNER_EMAIL = "owner@sensical.test";
export const OWNER_PASSWORD = "mesh-owner-12";
export const OWNER_BO_EMAIL = "river@sensical.test";
export const OWNER_BO_PASSWORD = "mesh-owner-12";
export const OWNER_ADMIN_EMAIL = "admin@sensical.test";
export const OWNER_ADMIN_PASSWORD = "mesh-admin-12";
export const OWNER_STAFF_EMAIL = "staff@sensical.test";
export const OWNER_STAFF_PASSWORD = "mesh-staff-12";
export const OWNER_OPERATOR_EMAIL = "operator@sensical.test";
export const OWNER_OPERATOR_PASSWORD = "mesh-operator-12";

const t0 = "2026-01-01T00:00:00.000Z";

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function deletion(
  id: string,
  meshId: string,
  reason: DataDeletionRow["reason"],
  status: DataDeletionRow["status"],
  requestedById: string | null,
  requestedDays: number,
  deleteAfterDays: number,
  extra: { sourceId?: string; dataUntil?: number; attempts?: number; lastError?: string; completed?: number } = {},
): DataDeletionRow {
  return {
    id,
    meshId,
    sourceId: extra.sourceId ?? null,
    reason,
    requestedById,
    requestedAt: inDays(requestedDays),
    deleteAfter: inDays(deleteAfterDays),
    dataUntil: extra.dataUntil === undefined ? null : inDays(extra.dataUntil),
    status,
    attempts: extra.attempts ?? (status === "done" ? 1 : 0),
    lastError: extra.lastError ?? "",
    completedAt: extra.completed === undefined ? null : inDays(extra.completed),
  };
}

/** A seed date relative to now, or null when no retention period is set (nothing lapses). */
function daysFromNow(days: number): string | null {
  return DATA_RETENTION_DAYS ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
}

export type { BackfillRow, BlueprintRow, CalibrationRow, PostprocessingRow };

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
  sources: MemorySources;
  termsAcceptances: TermsAcceptance[];
  dataDeletions: DataDeletionRow[];
  /** Account terms version per owner; none for accounts made outside signup (admin, staff). */
  accountTerms: Map<string, string>;
  operatorRequests: OperatorRequestRow[];
  devices: MemoryDevices;
  measurements: MemoryMeasurements;
  readings: MemoryReadings;
  blueprints: BlueprintRow[];
  postprocessings: PostprocessingRow[];
  calibrations: CalibrationRow[];
  backfills: BackfillRow[];
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
  operatorId?: string;
  actors?: Map<string, Actor>;
  verifications?: Map<string, OwnerVerification>;
};

export function createStore(owners: StoreOwners = {}): Store {
  const adaId = owners.adaId ?? OWNER_ID;
  const boId = owners.boId ?? OWNER_BO_ID;
  const operatorId = owners.operatorId ?? OWNER_OPERATOR_ID;
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
      // As the registry files postprocessing outputs: computed origin, flat `derived` namespace, no display name.
      payloadKind: "computed:derived",
      fieldName: "dew_point",
      channel: "derived.dew_point",
      origin: "computed",
      displayName: null,
      description: null,
      nativeUnit: "Cel",
      quantityKind: "physical_property",
      vocabularyUri: null,
      createdAt: t0,
      updatedAt: t0,
    },
    {
      id: MEAS_GAP_ID,
      payloadKind: "computed:quality",
      fieldName: "completeness_ratio",
      channel: "quality.completeness_ratio",
      origin: "computed",
      displayName: "Completeness",
      description: null,
      nativeUnit: "ratio",
      quantityKind: "ratio",
      vocabularyUri: null,
      createdAt: t0,
      updatedAt: t0,
    },
    {
      id: MEAS_RH_ID,
      payloadKind: "environmentmetrics",
      fieldName: "relative_humidity",
      channel: "environmentmetrics.relative_humidity",
      origin: "measured",
      displayName: "Relative humidity",
      description: null,
      nativeUnit: "%",
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
      termsAcceptedVersion: TERMS_VERSIONS.mesh,
      termsExpiresAt: daysFromNow(300),
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
      // Lapsed: River stores no new data until Bo renews its terms.
      termsAcceptedVersion: TERMS_VERSIONS.mesh,
      termsExpiresAt: daysFromNow(-5),
      pausedAt: daysFromNow(-5),
      // Public so the read-only view of someone else's mesh shows up locally.
      isPublic: true,
      createdAt: t0,
      updatedAt: t0,
    }),
  );
  const sources = new MemorySources();
  sources.items.set(SOURCE_PUBLIC_ID, {
    id: SOURCE_PUBLIC_ID,
    label: "Meshtastic public EU",
    server: "mqtt.meshtastic.org:1883",
    ssl: false,
    username: "meshdev",
    password: "large4cats",
    topic: "msh/EU_868/2/e/Valley/#",
    qos: 1,
    createdById: operatorId,
    termsAcceptedVersion: TERMS_VERSIONS.source,
    // Lapses soon, so the Sources tab offers renewal.
    termsExpiresAt: daysFromNow(10),
    pausedAt: null,
    createdAt: t0,
    updatedAt: t0,
  });
  meshes.items.set(
    MESH_BRIDGED_ID,
    new Mesh({
      id: MESH_BRIDGED_ID,
      channelId: "Valley",
      pskB64: "c2VjcmV0VmFsbGV5",
      label: "Valley",
      ownerId: operatorId,
      sourceId: SOURCE_PUBLIC_ID,
      createdAt: t0,
      updatedAt: t0,
    }),
  );
  // Status states: two more sources for the operator (disconnected, lapsed) and a mesh on each,
  // and Ada's meshes that renew soon, were never accepted, and were accepted under older terms.
  for (const [id, label, server, pausedAt] of [
    [SOURCE_OFFLINE_ID, "Offline test", "offline.example.org:1883", null],
    [SOURCE_LAPSED_ID, "Lapsed source", "mqtt.example.org:1883", daysFromNow(-3)],
  ] as const) {
    sources.items.set(id, {
      id,
      label,
      server,
      ssl: true,
      username: null,
      password: null,
      topic: "msh/EU_868/2/e/Test/#",
      qos: 1,
      createdById: operatorId,
      termsAcceptedVersion: TERMS_VERSIONS.source,
      termsExpiresAt: pausedAt ? daysFromNow(-3) : daysFromNow(200),
      pausedAt,
      createdAt: t0,
      updatedAt: t0,
    });
  }
  const statusMeshes: [string, string, string, Partial<ConstructorParameters<typeof Mesh>[0]>][] = [
    ["22222222-3333-4333-8333-000000000001", "Brook", operatorId, { sourceId: SOURCE_OFFLINE_ID }],
    ["22222222-3333-4333-8333-000000000002", "Creek", operatorId, { sourceId: SOURCE_LAPSED_ID }],
    ["22222222-3333-4333-8333-000000000003", "Garden", adaId, { termsAcceptedVersion: TERMS_VERSIONS.mesh, termsExpiresAt: daysFromNow(10) }],
    ["22222222-3333-4333-8333-000000000004", "Orchard", adaId, {}],
    ["22222222-3333-4333-8333-000000000005", "Meadow", adaId, { termsAcceptedVersion: "meshes-2025-01", termsExpiresAt: daysFromNow(120) }],
  ];
  for (const [id, label, ownerId, extra] of statusMeshes) {
    meshes.items.set(
      id,
      new Mesh({ id, channelId: label, pskB64: "c2VjcmV0", label, ownerId, createdAt: t0, updatedAt: t0, ...extra }),
    );
  }
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
      postprocessingCount: 0,
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
      postprocessingCount: 1,
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
      postprocessingCount: 0,
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
    sources,
    termsAcceptances: [],
    // One of each state for the superuser's Deletions page. River's matches Bo's lapsed terms.
    dataDeletions: [
      // With terms off the API resumes River and cancels its lapse on the next lifecycle pass.
      deletion("19191919-1919-4191-8191-000000000001", MESH_RIVER_ID, "terms_lapsed", TERMS_ENFORCED ? "pending" : "cancelled", null, -5, 25, { dataUntil: -5, ...(TERMS_ENFORCED ? {} : { completed: -1 }) }),
      deletion("19191919-1919-4191-8191-000000000002", MESH_GONE_ID, "mesh_deleted", "pending", adaId, -20, 10),
      deletion("19191919-1919-4191-8191-000000000003", MESH_GONE_ID, "source_detached", "pending", operatorId, -40, -10, {
        sourceId: SOURCE_PUBLIC_ID,
        dataUntil: -40,
        attempts: 3,
        lastError: "InfluxDB delete failed: connection refused",
      }),
      deletion("19191919-1919-4191-8191-000000000004", MESH_GONE_ID, "mesh_deleted", "done", adaId, -60, -30, { completed: -30 }),
      deletion("19191919-1919-4191-8191-000000000005", MESH_BRIDGED_ID, "source_detached", "cancelled", operatorId, -15, 15, {
        sourceId: SOURCE_PUBLIC_ID,
        dataUntil: -15,
        completed: -12,
      }),
    ],
    accountTerms: new Map<string, string>([
      [adaId, TERMS_VERSIONS.account],
      [boId, TERMS_VERSIONS.account],
      [operatorId, TERMS_VERSIONS.account],
    ]),
    operatorRequests: [
      {
        id: OPERATOR_REQUEST_BO_ID,
        ownerId: boId,
        reason: "I run the River community mesh and want to bridge our channel from the public broker.",
        status: "pending",
        decidedById: null,
        decisionNote: "",
        decidedAt: null,
        createdAt: t0,
      },
    ],
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
        description: "Dew point from temperature and relative humidity.",
        isPublic: false,
        ownerId: adaId,
        versions: [
          {
            number: 1,
            inputs: [
              { slot: "temperature", default_channel: "environmentmetrics.temperature" },
              { slot: "relative_humidity", default_channel: "environmentmetrics.relative_humidity" },
            ],
            steps: [
              {
                key: "dew",
                order: 0,
                function_name: "dew_point",
                inputs: { temperature: "slot:temperature", relative_humidity: "slot:relative_humidity" },
                params: {},
                outputs: { dew_point: "dew_point" },
              },
            ],
            notes: null,
            createdAt: t0,
          },
        ],
        createdAt: t0,
        updatedAt: t0,
      },
      {
        id: BLUEPRINT_NO2_ID,
        name: "NO2 electrochemical",
        description: "Alphasense-style four-electrode NO2 sensor on an ADS1115.",
        isPublic: true,
        ownerId: OWNER_ADMIN_ID,
        versions: [1, 2].map((number): BlueprintVersionRow => ({
          number,
          inputs: [
            { slot: "working", default_channel: "ads1115.channel_0" },
            { slot: "auxiliary", default_channel: "ads1115.channel_1" },
            { slot: "temperature", default_channel: "environmentmetrics.temperature" },
          ],
          steps: [
            {
              key: "ppb",
              order: 0,
              function_name: "ec_sensor_ppb",
              inputs: { working: "slot:working", auxiliary: "slot:auxiliary", temperature: "slot:temperature" },
              params: { temperature_coefficient: 0.01 },
              outputs: { concentration_ppb: "no2_ppb" },
            },
            ...(number === 2
              ? [
                  {
                    key: "ugm3",
                    order: 1,
                    function_name: "ppb_to_ugm3",
                    inputs: { concentration_ppb: "step:ppb.concentration_ppb", temperature: "slot:temperature" },
                    params: { molecular_weight: 46.01 },
                    outputs: { concentration_ugm3: "no2_ugm3" },
                  },
                ]
              : []),
          ],
          notes: number === 2 ? "Adds the mass concentration." : null,
          createdAt: t0,
        })),
        createdAt: t0,
        updatedAt: t0,
      },
    ],
    postprocessings: [
      {
        id: POSTPROCESSING_DEW_ID,
        deviceUuid: DEVICE_NODE_ID,
        blueprintId: BLUEPRINT_ID,
        versionNumber: 1,
        bindings: { temperature: DEVICE_MEAS_ID, relative_humidity: deviceMeasurementId(3) },
        outputPrefix: "",
        toleranceSeconds: null,
        isEnabled: true,
        outputs: [{ fieldName: "dew_point", measurementId: DEVICE_DEW_MEAS_ID, measurementTypeId: MEAS_DEW_ID, unit: "Cel" }],
        createdAt: t0,
        updatedAt: t0,
      },
    ],
    calibrations: [],
    backfills: [],
  };
}
