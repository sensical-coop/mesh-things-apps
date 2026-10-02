import type { Device } from "@mtt/domain/device/Device";
import type { Mesh } from "@mtt/domain/mesh/Mesh";
import type { MeasurementType } from "@mtt/domain/measurement/Measurement";
import type { LatestReading } from "@mtt/domain/readings/Readings";
import type { Source } from "@mtt/domain/source/Source";
import type { OperatorRequestRow } from "./features/operator-request/repository";
import type { DataDeletionRow } from "./features/data-deletion/repository";

import { flagsForRole, roleFlag, type Actor } from "@mtt/domain/authz/authz";

/** `includeSource` is for the mesh's owner and superusers, as in the API. */
export function meshJson(mesh: Mesh, includePsk: boolean, includeSource = includePsk) {
  const row: Record<string, unknown> = {
    id: mesh.id,
    channel_id: mesh.channelId,
    label: mesh.label,
    owner_id: mesh.ownerId,
    is_public: mesh.isPublic,
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

/** The password is write-only: never returned to anyone. */
export function sourceJson(source: Source) {
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
  // An `offline.` host stands in for a remote broker the bridge can't reach.
  const bridge = source.server.startsWith("offline.") ? "disconnected" : status;
  return { ...sourceJson(source), status: source.pausedAt ? "paused" : bridge };
}

export function deviceJson(device: Device) {
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
    postprocessing_blueprint_id: device.postprocessingBlueprintId,
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
    terms_accepted_version: accountTermsVersion,
  };
}

export function ownerProfileJson(
  actor: Actor,
  devices: Device[],
  verification: { emailVerifiedAt: string | null; emailVerificationSentAt: string | null },
  accountTermsVersion: string | null = null,
) {
  return {
    ...ownerReadJson(actor, verification, accountTermsVersion),
    devices: devices.map(deviceJson),
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
