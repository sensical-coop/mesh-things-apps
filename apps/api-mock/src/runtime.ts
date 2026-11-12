import type { Context } from "hono";
import type { Device } from "@mtt/domain/device/Device";
import type { Mesh } from "@mtt/domain/mesh/Mesh";
import { archivesFor, canSeeArchiveSetting } from "@mtt/contracts/authz";
import { matchList, parseListFilterValue, type ListFilter } from "@mtt/contracts/list-filter";
import type { Actor } from "./auth";
import { newId, nowIso } from "@mtt/domain/shared/ids";
import type { DataDeletionReason } from "./features/data-deletion/repository";
import { DATA_DELETION_GRACE_DAYS, TERMS_VERSIONS, acceptTerms } from "./features/terms/terms";
import type { MockAuth } from "./auth";
import { devicesFor, isUuid, verificationOf } from "./http";
import { deviceJson, ownerProfileJson, ownerReadJson, ownerWithApiKeyJson, type DeviceJson } from "./serialize";
import type { Store } from "./store";

export type RouteRuntime = {
  db: Store;
  auth: MockAuth;
  syncArchive: (device: Device, mesh: Mesh) => void;
  detachFromSinks: (target: { meshId?: string; deviceUuid?: string }) => void;
  deleteDevice: (uuid: string) => Promise<void>;
  devicesJson: (actor: Actor, devices: Device[]) => Promise<DeviceJson[]>;
  telemetryVariantQuery: (c: Context) => { filter: ListFilter | null } | { error: Record<string, string[]> };
  reportsVariants: (device: Device, filter: ListFilter | null) => boolean;
  deviceOut: (actor: Actor, device: Device) => Promise<DeviceJson | undefined>;
  deleteMesh: (mesh: Mesh, requestedById: string) => Promise<void>;
  revokeVerificationTokens: (ownerId: string) => void;
  issueVerificationToken: (ownerId: string) => string;
  scheduleMeshDeletion: (meshId: string, reason: DataDeletionReason, opts?: { sourceId?: string | null; requestedById?: string | null; dataUntil?: string | null }) => void;
  cancelMeshDeletions: (meshIds: readonly string[], reason: DataDeletionReason, sourceId: string | null) => void;
  renewMeshTerms: (mesh: Mesh) => void;
  meshTermsCurrent: (mesh: { termsAcceptedVersion: string | null; termsExpiresAt: string | null }) => boolean;
  ownerRead: (owner: Actor) => ReturnType<typeof ownerReadJson>;
  ownerProfile: (owner: Actor) => Promise<ReturnType<typeof ownerProfileJson>>;
  ownerWithApiKey: (owner: Actor, apiKey: string) => ReturnType<typeof ownerWithApiKeyJson>;
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
    const owners = new Map((await db.meshes.list()).map((mesh) => [mesh.id, mesh.ownerId]));
    return devices.map((device) =>
      deviceJson(device, {
        archive: canSeeArchiveSetting(actor, { ownerId: owners.get(device.meshId) ?? "" }),
        telemetryVariantIds: db.deviceTelemetryVariants.get(device.uuid) ?? [],
      }),
    );
  }

  /** Bare ids mean `has_any_of`. Anything else must already be one of the three set operators. */
  function telemetryVariantFilter(raw: string): ListFilter | null {
    const parsed = parseListFilterValue(raw);
    if (!parsed) return null;
    const operator = raw.includes(":") ? parsed.operator : "has_any_of";
    if (operator !== "has_any_of" && operator !== "has_all_of" && operator !== "has_none_of") return null;
    if (!parsed.values.length || !parsed.values.every((id) => isUuid(id))) return null;
    return { field: "telemetry_variant", operator, values: parsed.values };
  }

  /** `?telemetry_variant=`: no filter when absent, a 400 body when malformed. */
  function telemetryVariantQuery(c: Context): { filter: ListFilter | null } | { error: Record<string, string[]> } {
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

  function reportsVariants(device: Device, filter: ListFilter | null): boolean {
    return !filter || matchList(db.deviceTelemetryVariants.get(device.uuid) ?? [], filter);
  }

  async function deviceOut(actor: Actor, device: Device) {
    const [json] = await devicesJson(actor, [device]);
    return json;
  }

  /** The mesh, its devices and its sink links go; its stored readings follow once the grace period ends. */
  async function deleteMesh(mesh: Mesh, requestedById: string) {
    for (const device of await db.devices.list({ meshId: mesh.id })) await deleteDevice(device.uuid);
    detachFromSinks({ meshId: mesh.id });
    await db.meshes.delete(mesh.id);
    scheduleMeshDeletion(mesh.id, "mesh_deleted", { sourceId: mesh.sourceId, requestedById });
  }

  function revokeVerificationTokens(ownerId: string) {
    for (const [existing, id] of db.verificationTokens) {
      if (id === ownerId) db.verificationTokens.delete(existing);
    }
  }

  /** A fresh verification link replaces any earlier one of the owner. */
  function issueVerificationToken(ownerId: string): string {
    revokeVerificationTokens(ownerId);
    const token = newId();
    db.verificationTokens.set(token, ownerId);
    return token;
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

  /** Accepting the mesh terms resumes a mesh a lapse paused and cancels the deletion that lapse scheduled. */
  function renewMeshTerms(mesh: Mesh) {
    if (mesh.pausedAt) cancelMeshDeletions([mesh.id], "terms_lapsed", null);
    acceptTerms("mesh", mesh);
  }

  /** A mesh on the default broker needs a current mesh acceptance; on a source, its source terms apply. */
  function meshTermsCurrent(mesh: { termsAcceptedVersion: string | null; termsExpiresAt: string | null }): boolean {
    const lapsed = mesh.termsExpiresAt !== null && new Date(mesh.termsExpiresAt).getTime() <= Date.now();
    return mesh.termsAcceptedVersion === TERMS_VERSIONS.mesh && !lapsed;
  }

  const termsOf = (owner: Actor) => db.accountTerms.get(owner.id) ?? null;

  /** An owner as the API shows them, with their verification state and accepted account terms. */
  function ownerRead(owner: Actor) {
    return ownerReadJson(owner, verificationOf(db, owner.id), termsOf(owner));
  }

  async function ownerProfile(owner: Actor) {
    const devices = await devicesJson(owner, await devicesFor(db, owner));
    return ownerProfileJson(owner, devices, verificationOf(db, owner.id), termsOf(owner));
  }

  function ownerWithApiKey(owner: Actor, apiKey: string) {
    return ownerWithApiKeyJson(owner, verificationOf(db, owner.id), apiKey, termsOf(owner));
  }
  return { db, auth, syncArchive, detachFromSinks, deleteDevice, devicesJson, telemetryVariantQuery, reportsVariants, deviceOut, deleteMesh, revokeVerificationTokens, issueVerificationToken, scheduleMeshDeletion, cancelMeshDeletions, renewMeshTerms, meshTermsCurrent, ownerRead, ownerProfile, ownerWithApiKey };
}
