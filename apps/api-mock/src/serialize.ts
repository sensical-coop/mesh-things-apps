import type { Device } from "@mtt/domain/device/Device";
import { NIL_UUID } from "@mtt/domain/shared/ids";
import type { Mesh } from "@mtt/domain/mesh/Mesh";
import type { MeasurementType } from "@mtt/domain/measurement/Measurement";
import type { LatestReading } from "@mtt/domain/readings/Readings";
import type { Source } from "@mtt/domain/source/Source";
import { protocolOf } from "./protocols";
import type { Sink } from "@mtt/domain/sink/Sink";
import { SINKS_BROKER, sinkTopicFilter, sinkUsername } from "./features/sink/repository";
import type { OperatorRequestRow } from "./features/operator-request/repository";
import type { DataDeletionRow } from "./features/data-deletion/repository";
import { latestVersion, type BlueprintRow, type BlueprintVersionRow } from "./features/blueprint/repository";
import type { BackfillRow, CalibrationRow, PostprocessingRow } from "./features/postprocessing/repository";

import { canSeeMeshSource, canSeePsk, flagsForRole, roleFlag } from "@mtt/contracts/authz";
import type { Actor } from "./auth";
import { brokerHost } from "./features/source/rules";
import type { DeviceChannel } from "./features/device/channels";
import { VARIANT_ENV_ID, type Store } from "./store";

/** `includeSource` is for the mesh's owner and superusers, as in the API. */
export function meshJson(mesh: Mesh, includePsk: boolean, includeSource: boolean) {
  const row: Record<string, unknown> = {
    id: mesh.id,
    channel_id: mesh.channelId,
    label: mesh.label,
    owner_id: mesh.ownerId,
    is_public: mesh.isPublic,
    discover_gateways: mesh.discoverGateways,
    protocol: mesh.protocol,
    protocol_status: protocolOf(mesh.protocol)?.status ?? "supported",
    protocol_sunset: protocolOf(mesh.protocol)?.sunset ?? null,
    created_at: mesh.createdAt,
    updated_at: mesh.updatedAt,
  };
  if (includePsk) row.psk_b64 = mesh.pskB64;
  if (includeSource) {
    // Owner and superusers, like `source_id`: where the mesh stands with its terms.
    row.source_id = mesh.sourceId;
    row.terms_accepted_version = mesh.termsAcceptedVersion;
    row.terms_expires_at = mesh.termsExpiresAt;
    row.paused_at = mesh.pausedAt;
  }
  return row;
}

/** A mesh as `actor` may see it. */
export const meshOut = (actor: Actor, mesh: Mesh) => meshJson(mesh, canSeePsk(actor, mesh), canSeeMeshSource(actor, mesh));

/** The password is write-only: never returned to anyone. */
function sourceJson(source: Source) {
  return {
    id: source.id,
    label: source.label,
    server: source.server,
    ssl: source.ssl,
    username: source.username,
    topic: source.topic,
    qos: source.qos,
    terms_accepted_version: source.termsAcceptedVersion,
    terms_expires_at: source.termsExpiresAt,
    paused_at: source.pausedAt,
    created_by_id: source.createdById,
    created_at: source.createdAt,
    updated_at: source.updatedAt,
  };
}

/** A lapsed source reports `paused`, whatever its bridge would say. */
export function sourceReadJson(source: Source, status = "connected") {
  const bridge = brokerHost(source.server).offline ? "disconnected" : status;
  return { ...sourceJson(source), status: source.pausedAt ? "paused" : bridge };
}

/** As SinkReadSerializer: never the password. `connections` is null when the broker can't be asked. */
export function sinkReadJson(sink: Sink, connections: number | null) {
  return {
    id: sink.id,
    label: sink.label,
    streams: sink.streams,
    mesh_ids: sink.meshIds,
    device_ids: sink.deviceIds,
    broker: SINKS_BROKER,
    username: sinkUsername(sink.id),
    topic_filter: sinkTopicFilter(sink.id),
    connections,
    paused_at: sink.pausedAt,
    terms_accepted_version: sink.termsAcceptedVersion,
    terms_expires_at: sink.termsExpiresAt,
    created_by_id: sink.createdById,
    created_at: sink.createdAt,
    updated_at: sink.updatedAt,
  };
}

/** Creating a sink or rotating its credentials: the one response that carries the password. */
export function sinkCredentialsJson(sink: Sink, connections: number | null) {
  return { ...sinkReadJson(sink, connections), password: sink.password };
}

/** `archive`: whether the viewer may see the archive setting, the mesh's owner or a superuser. */
export type DeviceJson = {
  uuid: string;
  node_id: number;
  mesh_id: string;
  label: string | null;
  is_gateway: boolean;
  is_allowed: boolean;
  absence_detection_enabled: boolean;
  admin_keys_b64: string[];
  latitude: number | null;
  longitude: number | null;
  location_overridden: boolean;
  name: string | null;
  short_name: string | null;
  hardware_type: string | null;
  role: string | null;
  nodeinfo_overridden: boolean;
  reading_interval_seconds: number | null;
  publish_interval_seconds: number | null;
  telemetry_variant_ids: string[];
  archive_enabled?: boolean;
  archive_enabled_by?: string | null;
  archive_enabled_at?: string | null;
  discovered_at: null;
  protocol: string;
  observed_protocol: null;
  observed_protocol_at: null;
  firmware_version: null;
  firmware_protocol: null;
  firmware_seen_at: null;
  region: null;
  modem_preset: null;
  protocol_mismatch: boolean;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
};

export function deviceJson(
  device: Device,
  {
    archive,
    telemetryVariantIds,
    protocol,
  }: { archive: boolean; telemetryVariantIds: readonly string[]; protocol: string },
): DeviceJson {
  return {
    uuid: device.uuid,
    node_id: device.nodeId,
    mesh_id: device.meshId,
    label: device.label,
    is_gateway: device.isGateway,
    is_allowed: device.isAllowed,
    absence_detection_enabled: device.absenceDetectionEnabled,
    admin_keys_b64: device.adminKeysB64,
    latitude: device.latitude,
    longitude: device.longitude,
    location_overridden: device.locationOverridden,
    name: device.name,
    short_name: device.shortName,
    hardware_type: device.hardwareType,
    role: device.role,
    nodeinfo_overridden: device.nodeinfoOverridden,
    reading_interval_seconds: device.readingIntervalSeconds,
    publish_interval_seconds: device.publishIntervalSeconds,
    telemetry_variant_ids: [...telemetryVariantIds],
    ...(archive
      ? {
          archive_enabled: device.archiveEnabled,
          archive_enabled_at: device.archiveEnabledAt,
          archive_enabled_by: device.archiveEnabledBy,
        }
      : {}),
    last_seen: device.lastSeen,
    // The mock registers every gateway by hand.
    discovered_at: null,
    // The mock receives no packets or map reports, so nothing is ever observed.
    protocol,
    observed_protocol: null,
    observed_protocol_at: null,
    firmware_version: null,
    firmware_protocol: null,
    firmware_seen_at: null,
    region: null,
    modem_preset: null,
    protocol_mismatch: false,
    created_at: device.createdAt,
    updated_at: device.updatedAt,
  };
}

export function measurementJson(m: MeasurementType) {
  return {
    id: m.id,
    payload_kind: m.payloadKind,
    field_name: m.fieldName,
    channel: m.channel,
    origin: m.origin,
    display_name: m.displayName,
    description: m.description,
    native_unit: m.nativeUnit,
    quantity_kind: m.quantityKind,
    vocabulary_uri: m.vocabularyUri,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
  };
}

function catalogDefaultDetectors(store: Store, measurementTypeId: string): string[] {
  for (const link of store.telemetryVariantMeasurements.values()) {
    if (link.measurementTypeId === measurementTypeId) return link.defaultEnabledDetectors;
  }
  return [];
}

export function deviceMeasurementJson(store: Store, device: Device, channel: DeviceChannel) {
  const { id, type } = channel;
  const enabledDetectors = store.detectorOverrides.get(id) ?? null;
  const effectiveDetectors = [...(enabledDetectors ?? catalogDefaultDetectors(store, type.id))].sort();
  const range = store.deviceMeasurementRanges.get(id) ?? { validMin: null, validMax: null };
  return {
    id,
    telemetry_variant_id: type.origin === "measured" ? VARIANT_ENV_ID : NIL_UUID,
    measurement_type: measurementJson(type),
    enabled_detectors: enabledDetectors,
    effective_detectors: effectiveDetectors,
    valid_min: range.validMin,
    valid_max: range.validMax,
    produced_by: channel.producedBy,
    first_seen: device.createdAt,
    last_seen: device.lastSeen,
  };
}

export function telemetryVariantMeasurementJson(store: Store, type: MeasurementType, linkId: string) {
  const link = store.telemetryVariantMeasurements.get(linkId) ?? { defaultEnabledDetectors: [] };
  return {
    id: linkId,
    measurement_type: measurementJson(type),
    default_enabled_detectors: [...link.defaultEnabledDetectors].sort(),
    created_at: type.createdAt,
    updated_at: type.updatedAt,
  };
}

export function blueprintVersionJson(blueprintId: string, version: BlueprintVersionRow, deviceCount: number) {
  return {
    blueprint_id: blueprintId,
    number: version.number,
    inputs: version.inputs,
    steps: version.steps,
    notes: version.notes,
    device_count: deviceCount,
    created_at: version.createdAt,
  };
}

export function blueprintJson(row: BlueprintRow, deviceCount: (number: number) => number) {
  const latest = latestVersion(row);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    is_public: row.isPublic,
    owner_id: row.ownerId,
    latest_version: blueprintVersionJson(row.id, latest, deviceCount(latest.number)),
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function postprocessingJson(
  row: PostprocessingRow,
  blueprint: BlueprintRow,
  effectiveToleranceSeconds: number,
  outputChannel: (output: PostprocessingRow["outputs"][number]) => string,
  problems: string[],
) {
  return {
    id: row.id,
    device_uuid: row.deviceUuid,
    blueprint_id: row.blueprintId,
    blueprint_name: blueprint.name,
    blueprint_version: row.versionNumber,
    input_bindings: row.bindings,
    output_prefix: row.outputPrefix,
    tolerance_seconds: row.toleranceSeconds,
    effective_tolerance_seconds: effectiveToleranceSeconds,
    is_enabled: row.isEnabled,
    outputs: [...row.outputs]
      .sort((a, b) => a.fieldName.localeCompare(b.fieldName))
      .map((output) => ({
        field_name: output.fieldName,
        channel: outputChannel(output),
        measurement_id: output.measurementId,
        unit: output.unit,
      })),
    problems,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function calibrationJson(row: CalibrationRow) {
  return {
    id: row.id,
    step_key: row.stepKey,
    function_name: row.functionName,
    params: row.params,
    valid_from: row.validFrom,
    created_at: row.createdAt,
  };
}

export function backfillJson(row: BackfillRow) {
  return {
    id: row.id,
    postprocessing_id: row.postprocessingId,
    start: row.start,
    stop: row.stop,
    include_dependants: row.includeDependants,
    status: row.status,
    points_published: row.pointsPublished,
    error: row.error,
    created_at: row.createdAt,
    started_at: row.startedAt,
    finished_at: row.finishedAt,
  };
}

export function ownerPublicJson(actor: Actor) {
  return {
    id: actor.id,
    name: actor.name,
    created_at: actor.createdAt,
  };
}

export function ownerReadJson(
  actor: Actor,
  verification: { emailVerifiedAt: string | null; emailVerificationSentAt: string | null },
  /** The account terms version this owner accepted; they don't lapse. */
  accountTermsVersion: string | null = null,
) {
  const flags = flagsForRole(actor.role);
  return {
    id: actor.id,
    name: actor.name,
    email: actor.email,
    is_superuser: flags.isSuperuser,
    is_staff: flags.isStaff,
    role: roleFlag(actor.role),
    is_active: actor.isActive,
    email_verified_at: verification.emailVerifiedAt,
    email_verification_sent_at: verification.emailVerificationSentAt,
    last_login: actor.lastLogin,
    created_at: actor.createdAt,
    alarm_email_cooldown_seconds: actor.alarmEmailCooldownSeconds,
    status_alerts_enabled: actor.statusAlertsEnabled,
    source_rate_alerts_enabled: actor.sourceRateAlertsEnabled,
    terms_accepted_version: accountTermsVersion,
  };
}

export function ownerProfileJson(
  actor: Actor,
  devices: DeviceJson[],
  verification: { emailVerifiedAt: string | null; emailVerificationSentAt: string | null },
  accountTermsVersion: string | null = null,
) {
  return {
    ...ownerReadJson(actor, verification, accountTermsVersion),
    devices,
  };
}

export function ownerWithApiKeyJson(
  actor: Actor,
  verification: { emailVerifiedAt: string | null; emailVerificationSentAt: string | null },
  apiKey: string,
  accountTermsVersion: string | null = null,
) {
  return {
    ...ownerReadJson(actor, verification, accountTermsVersion),
    api_key: apiKey,
  };
}

export function latestJson(device: Device, readings: LatestReading[]) {
  return {
    mesh_id: device.meshId,
    node_id: device.nodeId,
    readings: readings.map((r) => ({
      payload_kind: r.payloadKind,
      field_name: r.fieldName,
      channel: r.channel,
      value: r.value,
      time: r.time,
      unit: r.unit,
      quantity_kind: r.quantityKind,
      vocabulary_uri: r.vocabularyUri,
      origin: r.origin,
    })),
  };
}

/** An operator request as its requester sees it. */
export function operatorRequestJson(row: OperatorRequestRow) {
  return {
    id: row.id,
    reason: row.reason,
    status: row.status,
    decision_note: row.decisionNote,
    decided_at: row.decidedAt,
    created_at: row.createdAt,
  };
}

/** An operator request as a superuser sees it. */
export function operatorRequestAdminJson(row: OperatorRequestRow, owner: Pick<Actor, "name" | "email"> | undefined) {
  return {
    ...operatorRequestJson(row),
    owner_id: row.ownerId,
    owner_name: owner?.name ?? "",
    owner_email: owner?.email ?? "",
    decided_by_id: row.decidedById,
  };
}

export function dataDeletionJson(row: DataDeletionRow) {
  return {
    id: row.id,
    mesh_id: row.meshId,
    source_id: row.sourceId,
    reason: row.reason,
    requested_by_id: row.requestedById,
    requested_at: row.requestedAt,
    delete_after: row.deleteAfter,
    data_until: row.dataUntil,
    status: row.status,
    attempts: row.attempts,
    last_error: row.lastError,
    completed_at: row.completedAt,
  };
}
