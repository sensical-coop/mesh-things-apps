import type { Device } from "@mtt/domain/device/Device";
import type { Mesh } from "@mtt/domain/mesh/Mesh";
import type { MeasurementType } from "@mtt/domain/measurement/Measurement";
import type { LatestReading } from "@mtt/domain/readings/Readings";
import { NIL_BLUEPRINT_ID } from "@mtt/domain/shared/blueprint";
import { flagsForRole, type Actor } from "@mtt/domain/authz/authz";

export function meshJson(mesh: Mesh, includePsk: boolean) {
  const row: Record<string, unknown> = {
    id: mesh.id,
    channel_id: mesh.channelId,
    label: mesh.label,
    owner_id: mesh.ownerId,
    created_at: mesh.createdAt,
    updated_at: mesh.updatedAt,
  };
  if (includePsk) row.psk_b64 = mesh.pskB64;
  return row;
}

export function deviceJson(device: Device) {
  return {
    uuid: device.uuid,
    node_id: device.nodeId,
    mesh_id: device.meshId,
    label: device.label,
    is_gateway: device.isGateway,
    is_allowed: device.isAllowed,
    admin_keys_b64: device.adminKeysB64,
    latitude: device.latitude,
    longitude: device.longitude,
    location_overridden: device.locationOverridden,
    name: device.name,
    short_name: device.shortName,
    hardware_type: device.hardwareType,
    role: device.role,
    nodeinfo_overridden: device.nodeinfoOverridden,
    postprocessing_blueprint_id: device.postprocessingBlueprintId ?? NIL_BLUEPRINT_ID,
    reading_interval_seconds: device.readingIntervalSeconds,
    publish_interval_seconds: device.publishIntervalSeconds,
    last_seen: device.lastSeen,
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

export function blueprintJson(row: {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  steps: unknown[];
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    owner_id: row.ownerId,
    steps: row.steps,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
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
) {
  const flags = flagsForRole(actor.role);
  return {
    id: actor.id,
    name: actor.name,
    email: actor.email,
    is_superuser: flags.isSuperuser,
    is_staff: flags.isStaff,
    is_active: actor.isActive,
    email_verified_at: verification.emailVerifiedAt,
    email_verification_sent_at: verification.emailVerificationSentAt,
    last_login: actor.lastLogin,
    created_at: actor.createdAt,
  };
}

export function ownerProfileJson(
  actor: Actor,
  devices: Device[],
  verification: { emailVerifiedAt: string | null; emailVerificationSentAt: string | null },
) {
  return {
    ...ownerReadJson(actor, verification),
    devices: devices.map(deviceJson),
  };
}

export function ownerWithApiKeyJson(
  actor: Actor,
  verification: { emailVerifiedAt: string | null; emailVerificationSentAt: string | null },
  apiKey: string,
) {
  return {
    ...ownerReadJson(actor, verification),
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
