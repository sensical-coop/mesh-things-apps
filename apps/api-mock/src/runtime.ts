import type { Context } from "hono";
import type { Device } from "@mtt/domain/device/Device";
import { DEFAULT_PROTOCOL, type Mesh } from "@mtt/domain/mesh/Mesh";
import { archivesFor, canSeeArchiveSetting, canWriteMesh, visibleSinks, visibleSources } from "@mtt/contracts/authz";
import { parseListFilterValue } from "@mtt/contracts/list-filter";
import { matchesTelemetryVariantFilter, type TelemetryVariantFilter } from "@mtt/domain/device/TelemetryVariantFilter";
import type { Actor } from "./auth";
import type { Sink } from "@mtt/domain/sink/Sink";
import type { Source } from "@mtt/domain/source/Source";
import { newId, nowIso } from "@mtt/domain/shared/ids";

const TELEMETRY_VARIANT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import type { DataDeletionReason } from "./features/data-deletion/repository";
import {
  acceptTerms as commitTerms,
  recordAcceptance as pushAcceptance,
  DATA_DELETION_GRACE_DAYS,
  TERMS_VERSIONS,
  type AcceptTermsResult,
  type TermsKind,
  type TermsLocale,
} from "./features/terms/terms";
import type { MockAuth } from "./auth";
import { deviceJson, type DeviceJson } from "./serialize";
import type { Store } from "./store";

export type { AcceptTermsResult };

export type RouteRuntime = {
  db: Store;
  auth: MockAuth;
  syncArchive: (device: Device, mesh: Mesh) => void;
  detachFromSinks: (target: { meshId?: string; deviceUuid?: string }) => void;
  deleteDevice: (uuid: string) => Promise<void>;
  devicesJson: (actor: Actor, devices: Device[]) => Promise<DeviceJson[]>;
  telemetryVariantQuery: (c: Context) => { filter: TelemetryVariantFilter | null } | { error: Record<string, string[]> };
  reportsVariants: (device: Device, filter: TelemetryVariantFilter | null) => boolean;
  deviceOut: (actor: Actor, device: Device) => Promise<DeviceJson | undefined>;
  canAttachSource: (actor: Actor, sourceId: string, current: string | null) => Promise<boolean>;
  acceptTerms: (kind: TermsKind, version: string | undefined, ownerId: string, locale: TermsLocale, sourceId?: string | null, commit?: boolean) => AcceptTermsResult;
  recordAcceptance: (kind: TermsKind, ownerId: string, locale: TermsLocale, sourceId?: string | null) => string | null;
  scheduleMeshDeletion: (meshId: string, reason: DataDeletionReason, opts?: { sourceId?: string | null; requestedById?: string | null; dataUntil?: string | null }) => void;
  cancelMeshDeletions: (meshIds: readonly string[], reason: DataDeletionReason, sourceId: string | null) => void;
  meshTermsCurrent: (mesh: { termsAcceptedVersion: string | null; termsExpiresAt: string | null }) => boolean;
  ownerTerms: (ownerId: string) => string | null;
  sinkForOperator: (actor: Actor, sinkId: string) => Promise<Sink | null>;
  sinkTargetErrors: (actor: Actor, input: { mesh_ids?: string[]; device_ids?: string[] }) => Promise<Record<string, string[]>>;
  sourceForOperator: (actor: Actor, sourceId: string) => Promise<Source | null>;
};

export function createRouteRuntime(db: Store, auth: MockAuth): RouteRuntime {
  /**
   * Starts or stops a device's archive hours, as registry publishes to mesh.sink_config.v1:
   * archived while switched on, allowed, and on a mesh whose owner is an operator.
   */
  function syncArchive(device: Device, mesh: Mesh) {
    const owner = db.actors.get(mesh.ownerId);
    const archived = device.archiveEnabled && device.isAllowed && owner != null && archivesFor(owner);
    if (archived) db.archive.start(mesh.id, device.nodeId, nowIso());
    else db.archive.stop(mesh.id, device.nodeId, nowIso());
  }

  /** A deleted mesh or device leaves every sink it was attached to, as the API's links cascade. */
  function detachFromSinks(target: { meshId?: string; deviceUuid?: string }) {
    for (const sink of db.sinks.items.values()) {
      sink.meshIds = sink.meshIds.filter((id) => id !== target.meshId);
      sink.deviceIds = sink.deviceIds.filter((id) => id !== target.deviceUuid);
    }
  }

  async function deleteDevice(uuid: string) {
    detachFromSinks({ deviceUuid: uuid });
    const device = await db.devices.get(uuid);
    if (device) db.archive.stop(device.meshId, device.nodeId, nowIso());
    const attached = new Set(db.postprocessings.filter((row) => row.deviceUuid === uuid).map((row) => row.id));
    db.postprocessings = db.postprocessings.filter((row) => !attached.has(row.id));
    db.calibrations = db.calibrations.filter((row) => !attached.has(row.postprocessingId));
    db.backfills = db.backfills.filter((row) => !attached.has(row.postprocessingId));
    db.deviceTelemetryVariants.delete(uuid);
    await db.devices.delete(uuid);
  }

  /** Devices as the API returns them, with the archive setting where the viewer may see it. */
  async function devicesJson(actor: Actor, devices: Device[]) {
    const meshes = new Map((await db.meshes.list()).map((mesh) => [mesh.id, mesh]));
    return devices.map((device) =>
      deviceJson(device, {
        archive: canSeeArchiveSetting(actor, { ownerId: meshes.get(device.meshId)?.ownerId ?? "" }),
        telemetryVariantIds: db.deviceTelemetryVariants.get(device.uuid) ?? [],
        protocol: meshes.get(device.meshId)?.protocol ?? DEFAULT_PROTOCOL,
      }),
    );
  }

  /** Bare ids mean `has_any_of`. Anything else must already be one of the three set operators. */
  function telemetryVariantFilter(raw: string): TelemetryVariantFilter | null {
    const parsed = parseListFilterValue(raw);
    if (!parsed) return null;
    const operator = raw.includes(":") ? parsed.operator : "has_any_of";
    if (operator !== "has_any_of" && operator !== "has_all_of" && operator !== "has_none_of") return null;
    if (!parsed.values.length || !parsed.values.every((id) => TELEMETRY_VARIANT_ID.test(id))) return null;
    return { operator, ids: parsed.values.map((id) => id.toLowerCase()) };
  }

  /** `?telemetry_variant=`: no filter when absent, a 400 body when malformed. */
  function telemetryVariantQuery(
    c: Context,
  ): { filter: TelemetryVariantFilter | null } | { error: Record<string, string[]> } {
    const raw = c.req.query("telemetry_variant");
    if (!raw) return { filter: null };
    const filter = telemetryVariantFilter(raw);
    if (!filter) {
      return {
        error: {
          telemetry_variant: ["Use has_any_of, has_all_of or has_none_of followed by telemetry variant ids."],
        },
      };
    }
    return { filter };
  }

  function reportsVariants(device: Device, filter: TelemetryVariantFilter | null): boolean {
    return !filter || matchesTelemetryVariantFilter(db.deviceTelemetryVariants.get(device.uuid) ?? [], filter);
  }

  async function deviceOut(actor: Actor, device: Device) {
    const [json] = await devicesJson(actor, [device]);
    return json;
  }

  async function canAttachSource(actor: Actor, sourceId: string, current: string | null): Promise<boolean> {
    if (sourceId === current) return true;
    const source = await db.sources.get(sourceId);
    return source != null && visibleSources(actor, [source]).length > 0;
  }

  function acceptTerms(kind: TermsKind, version: string | undefined, ownerId: string, locale: TermsLocale, sourceId: string | null = null, commit = true) {
    return commitTerms(db.termsAcceptances, kind, version, ownerId, locale, sourceId, commit);
  }

  function recordAcceptance(kind: TermsKind, ownerId: string, locale: TermsLocale, sourceId: string | null = null) {
    return pushAcceptance(db.termsAcceptances, kind, ownerId, locale, sourceId);
  }

  /** A mesh's stored readings, deleted once the grace period ends unless cancelled first. */
  function scheduleMeshDeletion(
    meshId: string,
    reason: DataDeletionReason,
    opts: { sourceId?: string | null; requestedById?: string | null; dataUntil?: string | null } = {},
  ) {
    const now = Date.now();
    db.dataDeletions.push({
      id: newId(),
      meshId,
      sourceId: opts.sourceId ?? null,
      reason,
      requestedById: opts.requestedById ?? null,
      requestedAt: new Date(now).toISOString(),
      deleteAfter: new Date(now + DATA_DELETION_GRACE_DAYS * 86_400_000).toISOString(),
      dataUntil: opts.dataUntil ?? null,
      status: "pending",
      attempts: 0,
      lastError: "",
      completedAt: null,
    });
  }

  /** Cancels pending deletions no longer wanted, e.g. after a renewal or moving a mesh back. */
  function cancelMeshDeletions(meshIds: readonly string[], reason: DataDeletionReason, sourceId: string | null) {
    const now = nowIso();
    for (const row of db.dataDeletions) {
      if (row.status === "pending" && row.reason === reason && row.sourceId === sourceId && meshIds.includes(row.meshId)) {
        row.status = "cancelled";
        row.completedAt = now;
      }
    }
  }

  /** A mesh on the default broker needs a current mesh acceptance; on a source, its source terms apply. */
  function meshTermsCurrent(mesh: { termsAcceptedVersion: string | null; termsExpiresAt: string | null }): boolean {
    const lapsed = mesh.termsExpiresAt !== null && new Date(mesh.termsExpiresAt).getTime() <= Date.now();
    return mesh.termsAcceptedVersion === TERMS_VERSIONS.mesh && !lapsed;
  }

  function ownerTerms(ownerId: string) {
    return db.accountTerms.get(ownerId) ?? null;
  }

  async function sinkForOperator(actor: Actor, sinkId: string): Promise<Sink | null> {
    const sink = await db.sinks.get(sinkId);
    return sink && visibleSinks(actor, [sink]).length > 0 ? sink : null;
  }

  /**
   * As SinkWriteSerializer: every mesh, and every device's mesh, must be one the caller may
   * edit and owned by an operator (a superuser counts).
   */
  async function sinkTargetErrors(
    actor: Actor,
    input: { mesh_ids?: string[]; device_ids?: string[] },
  ): Promise<Record<string, string[]>> {
    const errors: Record<string, string[]> = {};
    const check = async (label: string, meshId: string | null) => {
      const mesh = meshId ? await db.meshes.get(meshId) : null;
      if (!mesh || !canWriteMesh(actor, mesh)) return `${label} not found.`;
      const owner = db.actors.get(mesh.ownerId);
      if (!owner || !archivesFor(owner)) return `${label} is on a mesh not owned by an operator.`;
      return null;
    };
    for (const meshId of input.mesh_ids ?? []) {
      const error = await check(`Mesh ${meshId}`, meshId);
      if (error) (errors.mesh_ids ??= []).push(error);
    }
    for (const deviceId of input.device_ids ?? []) {
      const device = await db.devices.get(deviceId);
      const error = await check(`Device ${deviceId}`, device?.meshId ?? null);
      if (error) (errors.device_ids ??= []).push(error);
    }
    return errors;
  }

  async function sourceForOperator(actor: Actor, sourceId: string): Promise<Source | null> {
    const source = await db.sources.get(sourceId);
    return source && visibleSources(actor, [source]).length > 0 ? source : null;
  }
  return { db, auth, syncArchive, detachFromSinks, deleteDevice, devicesJson, telemetryVariantQuery, reportsVariants, deviceOut, canAttachSource, acceptTerms, recordAcceptance, scheduleMeshDeletion, cancelMeshDeletions, meshTermsCurrent, ownerTerms, sinkForOperator, sinkTargetErrors, sourceForOperator };
}
