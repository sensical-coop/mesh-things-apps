import {
  zDevicesCreateData,
  zDevicesMeasurementsUpdateData,
  zDevicesUpdateData,
  zMeshesCreateData,
  zMeshesTermsAcceptanceCreateData,
  zMeshesUpdateData,
  zOwnersCreateData,
  zOwnersLoginCreateData,
  zOwnersMeUpdateData,
  zOwnersRequestPasswordResetCreateData,
  zOwnersResetPasswordCreateData,
  zDevicesPostprocessingsBackfillsCreateData,
  zDevicesPostprocessingsCalibrationsCreateData,
  zDevicesPostprocessingsCreateData,
  zDevicesPostprocessingsUpdateData,
  zPostprocessingBlueprintsCreateData,
  zPostprocessingBlueprintsUpdateData,
  zPostprocessingBlueprintsVersionsCreateData,
  zOperatorRequestsUpdateData,
  zOwnersMeOperatorRequestCreateData,
  zOwnersMeTermsAcceptanceCreateData,
  zSourcesTermsAcceptanceCreateData,
  zSourcesCreateData,
  zSourcesUpdateData,
  zSinksCreateData,
  zSinksTermsAcceptanceCreateData,
  zSinksUpdateData,
  zTelemetryVariantsMeasurementsUpdateData,
} from "@mtt/contracts/zod";
import { matchesDeviceFilter, type Device } from "@mtt/domain/device/Device";
import {
  matchesTelemetryVariantFilter,
  parseTelemetryVariantFilter,
  type TelemetryVariantFilter,
} from "@mtt/domain/device/TelemetryVariantFilter";
import type { MeasurementType } from "@mtt/domain/measurement/Measurement";
import type { Mesh } from "@mtt/domain/mesh/Mesh";
import {
  canDecideOperatorRequests,
  canManageSinks,
  canManageSources,
  canRequestOperator,
  canSeeDataDeletions,
  archivesFor,
  canReadArchive,
  canSeeArchiveSetting,
  canSeeMeshSource,
  canReadMesh,
  canReadOwnerEmail,
  canSeePsk,
  canWriteMesh,
  canAttachBlueprint,
  canReadBlueprint,
  canWriteBlueprint,
  visibleBlueprints,
  visibleSinks,
  visibleSources,
  type Actor,
} from "@mtt/domain/authz/authz";
import { validateSource, type Source } from "@mtt/domain/source/Source";
import { orderStreams, type Sink } from "@mtt/domain/sink/Sink";
import { SINKS_ENABLED } from "./features/sink/repository";
import type { DataDeletionReason } from "./features/data-deletion/repository";
import {
  DATA_DELETION_GRACE_DAYS,
  TERMS_ENFORCED,
  TERMS_VERSIONS,
  acceptanceExpiry,
  termsJson,
  termsLocale,
  type TermsKind,
  type TermsLocale,
} from "./features/terms/terms";
import { parseListFilters } from "@mtt/domain/shared/list-filter";
import { NIL_UUID, newId, nowIso } from "@mtt/domain/shared/ids";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import {
  DETECTOR_CATALOG,
  DEVICE_NODE_ID,
  DEVICE_GW_ID,
  DEVICE_VARIANT_ID,
  MEASUREMENT_DETECTORS,
  MEAS_TEMP_ID,
  TELEMETRY_VARIANTS,
  VARIANT_ENV_ID,
  VARIANT_LINK_ID,
  deviceMeasurementId,
  type Store,
} from "./store";
import { ALGORITHMS } from "./features/algorithm/catalog";
import {
  ARCHIVE_BUCKET,
  ARCHIVE_CREDENTIAL_TTL_S,
  ARCHIVE_ENABLED,
  ARCHIVE_ISSUES_CREDENTIALS,
  ARCHIVE_PUBLIC_ENDPOINT,
  ARCHIVE_REGION,
  meshPrefix,
  partitionKey,
} from "./features/archive/repository";
import { storedZip } from "./features/archive/zip";
import {
  latestVersion,
  versionNumbered,
  type BlueprintInputRow,
  type BlueprintRow,
  type BlueprintStepRow,
  type BlueprintVersionRow,
} from "./features/blueprint/repository";
import { PREFIX_PATTERN, validateCalibration, versionErrors } from "./features/blueprint/validate";
import {
  MAX_BACKFILL_DAYS,
  outputFieldNames,
  problems,
  toleranceFor,
  type PostprocessingRow,
} from "./features/postprocessing/repository";
import { createMockAuth, seedStore, setOwnerPassword, stampLogin, type MockAuth } from "./auth";
import {
  backfillJson,
  blueprintJson,
  blueprintVersionJson,
  calibrationJson,
  deviceJson,
  latestJson,
  measurementJson,
  meshJson,
  ownerProfileJson,
  ownerPublicJson,
  ownerReadJson,
  ownerWithApiKeyJson,
  postprocessingJson,
  operatorRequestAdminJson,
  operatorRequestJson,
  dataDeletionJson,
  sinkCredentialsJson,
  sinkReadJson,
  sourceReadJson,
} from "./serialize";

type Env = { Variables: { actor: Actor } };

const RESEND_COOLDOWN_SECONDS = 60; // keep in sync with apps/web resend-cooldown.ts
const PASSWORD_RESET_TTL_HOURS = 1; // keep in sync with meshtastic-things REGISTRY__PASSWORD_RESET_TTL_HOURS
const INACTIVE_ALLOWED_PATHS = new Set(["/owners/me", "/owners/me/resend-verification"]);
const NO_VERIFICATION = { emailVerifiedAt: null, emailVerificationSentAt: null };

function queryFilters(c: { req: { query: (name: string) => string | undefined } }, fields: readonly string[]) {
  const query: Record<string, string | undefined> = {};
  for (const field of fields) query[field] = c.req.query(field);
  return parseListFilters(query);
}

/** DRF answers a bad body with `{ field: [message] }`; so does the mock. */
function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    // An issue on the whole body (or a path wrapper) has no field: DRF calls that non_field_errors.
    const field = [...issue.path].reverse().find((segment) => typeof segment === "string" && segment !== "body");
    const key = typeof field === "string" ? field : "non_field_errors";
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

/** The API's check on `terms_version`: only the current version counts. */
function termsVersionError(kind: TermsKind, version: string | undefined): Record<string, string[]> {
  // Terms off: `terms_version` is optional and ignored, even a stale one.
  if (!TERMS_ENFORCED) return {};
  if (version === TERMS_VERSIONS[kind]) return {};
  return {
    terms_version: [
      version === undefined
        ? "This field is required."
        : "These terms are out of date. Load the current terms and accept them again.",
    ],
  };
}

/** Mirrors SourceSerializer: a password needs a username, also once an edit removes it. */
function credentialErrors(username: string | null | undefined, password: string | null | undefined): Record<string, string[]> {
  return password && !username ? { username: ["A password needs a username."] } : {};
}

// Mirrors REGISTRY__SOURCES_BLOCKED_TOPICS left blank, which blocks `#`.
const SOURCES_BLOCKED_TOPICS = new Set(["#"]);

/** The server-side source checks, including the ones only the API can make. */
function sourceErrors(input: Partial<Pick<Source, "server" | "topic" | "qos">>): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const [key, message] of Object.entries(validateSource(input))) errors[key] = [message];
  const host = input.server?.trim().slice(0, input.server.trim().lastIndexOf(":")).toLowerCase();
  if (!errors.server && (host === "localhost" || host === "emqx")) {
    errors.server = ["A source cannot point at this instance's own broker."];
  }
  if (!errors.topic && input.topic !== undefined && SOURCES_BLOCKED_TOPICS.has(input.topic.trim())) {
    errors.topic = ["This topic filter is not allowed as a source."];
  }
  return errors;
}

/** Stands in for EMQX: a `.invalid` host fails the bridge, as an unreachable EMQX API would. */
function bridgeFails(source: Pick<Source, "server">): boolean {
  const host = source.server.slice(0, source.server.lastIndexOf(":"));
  return host.endsWith(".invalid");
}

function openPath(method: string, path: string): boolean {
  return (
    path === "/owners/login" ||
    path === "/owners/csrf-cookie" ||
    path === "/health" ||
    path.startsWith("/api/auth") ||
    (method === "POST" && path === "/owners") ||
    (method === "POST" && path === "/owners/request-password-reset") ||
    (method === "POST" && path === "/owners/reset-password") ||
    (method === "GET" && path === "/owners/verify-email") ||
    (method === "GET" && path === "/terms") ||
    // Presigned: the signature in the link is the authorisation.
    (method === "GET" && path.startsWith(MOCK_S3_PATH))
  );
}

/** Where the mock's presigned links point, standing in for the S3 endpoint. */
const MOCK_S3_PATH = "/mock-s3/";
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function applySetCookie(c: Context, headers: Headers) {
  const cookies = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  if (cookies.length) {
    for (const cookie of cookies) c.header("Set-Cookie", cookie, { append: true });
    return;
  }
  const single = headers.get("set-cookie");
  if (single) c.header("Set-Cookie", single, { append: true });
}

async function visibleMeshes(store: Store, actor: Actor, filters?: Parameters<Store["meshes"]["list"]>[0]) {
  return (await store.meshes.list(filters)).filter((mesh) => canReadMesh(actor, mesh));
}

/** A rejected registration is the mesh owner's business, not a viewer's. */
function visibleToReader(actor: Actor, mesh: Mesh, device: Device): boolean {
  return device.isAllowed || canWriteMesh(actor, mesh);
}

async function devicesFor(store: Store, actor: Actor) {
  const meshes = new Map((await visibleMeshes(store, actor)).map((mesh) => [mesh.id, mesh]));
  return (await store.devices.list()).filter((device) => {
    const mesh = meshes.get(device.meshId);
    return mesh != null && visibleToReader(actor, mesh, device);
  });
}

async function meshForRead(store: Store, actor: Actor, meshId: string) {
  const mesh = await store.meshes.get(meshId);
  if (!mesh || !canReadMesh(actor, mesh)) return null;
  return mesh;
}

async function deviceForRead(store: Store, actor: Actor, uuid: string) {
  const device = await store.devices.get(uuid);
  if (!device) return null;
  const mesh = await meshForRead(store, actor, device.meshId);
  if (!mesh || !visibleToReader(actor, mesh, device)) return null;
  return device;
}

// Only the fixtured temperature channel is linked into a telemetry-variant
// catalog entry (VARIANT_LINK_ID) in this mock; every other channel has no
// configured catalog default, so it effectively inherits an empty list.
function catalogDefaultDetectors(store: Store, measurementTypeId: string): string[] {
  if (measurementTypeId !== MEAS_TEMP_ID) return [];
  return store.telemetryVariantMeasurements.get(VARIANT_LINK_ID)?.defaultEnabledDetectors ?? [];
}

/** One of a device's channels: what it reports, and what its postprocessings derive. */
type DeviceChannel = { id: string; type: MeasurementType; producedBy: string | null };

async function deviceChannels(store: Store, device: Device): Promise<DeviceChannel[]> {
  const types = await store.measurements.list();
  // Only the Porch node reports telemetry in this mock.
  const reported =
    device.uuid === DEVICE_NODE_ID
      ? types.flatMap((type, i) => (type.channel.startsWith("derived.") ? [] : [{ id: deviceMeasurementId(i), type, producedBy: null }]))
      : [];
  const derived = store.postprocessings
    .filter((row) => row.deviceUuid === device.uuid)
    .flatMap((row) =>
      row.outputs.flatMap((output) => {
        const type = types.find((candidate) => candidate.id === output.measurementTypeId);
        return type ? [{ id: output.measurementId, type, producedBy: row.id }] : [];
      }),
    );
  return [...reported, ...derived];
}

function deviceMeasurementJson(store: Store, device: Device, channel: DeviceChannel) {
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

function telemetryVariantMeasurementJson(store: Store, type: MeasurementType, linkId: string) {
  const link = store.telemetryVariantMeasurements.get(linkId) ?? { defaultEnabledDetectors: [] };
  return {
    id: linkId,
    measurement_type: measurementJson(type),
    default_enabled_detectors: [...link.defaultEnabledDetectors].sort(),
    created_at: type.createdAt,
    updated_at: type.updatedAt,
  };
}

async function findDeviceMeasurement(store: Store, device: Device, measurementId: string): Promise<DeviceChannel | null> {
  return (await deviceChannels(store, device)).find((channel) => channel.id === measurementId) ?? null;
}

/** `{ key: string }` maps from a step body, or null when a value is not a string. */
function stringRecord(value: unknown): Record<string, string> | null {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (!entries.every(([, entry]) => typeof entry === "string")) return null;
  return Object.fromEntries(entries.map(([key, entry]) => [key, String(entry)]));
}

function plainRecord(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return null;
  return { ...value };
}

type VersionBody = {
  inputs: { slot: string; default_channel?: string | null }[];
  steps: { key: string; order: number; function_name: string; inputs?: unknown; params?: unknown; outputs?: unknown }[];
  notes?: string | null;
};

/** A version body as rows, or the 400 DRF would answer. */
function versionFromBody(
  body: VersionBody,
  number: number,
): { version: BlueprintVersionRow } | { errors: Record<string, unknown> } {
  const inputs: BlueprintInputRow[] = body.inputs.map((entry) =>
    entry.default_channel ? { slot: entry.slot, default_channel: entry.default_channel } : { slot: entry.slot },
  );
  const steps: BlueprintStepRow[] = [];
  for (const step of body.steps) {
    const stepInputs = stringRecord(step.inputs);
    const params = plainRecord(step.params);
    const outputs = stringRecord(step.outputs);
    if (!stepInputs || !params || !outputs) {
      return { errors: { steps: ["Step inputs and outputs map names to strings; params is an object"] } };
    }
    steps.push({ key: step.key, order: step.order, function_name: step.function_name, inputs: stepInputs, params, outputs });
  }
  const errors = versionErrors(inputs, steps);
  if (errors) return { errors };
  return { version: { number, inputs, steps: [...steps].sort((a, b) => a.order - b.order), notes: body.notes ?? null, createdAt: nowIso() } };
}

export async function createApp(store?: Store, auth: MockAuth = createMockAuth()) {
  const db = store ?? (await seedStore(auth));

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

  /** A device and everything attached to it. */
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

  /** A source the caller may see, or the mesh's current one, which resending always keeps. */
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

  /** `?telemetry_variant=`: no filter when absent, a 400 body when malformed. */
  function telemetryVariantQuery(
    c: Context,
  ): { filter: TelemetryVariantFilter | null } | { error: Record<string, string[]> } {
    const raw = c.req.query("telemetry_variant");
    if (!raw) return { filter: null };
    const filter = parseTelemetryVariantFilter(raw);
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

  /** Records an acceptance of the current terms, and returns its expiry (null: never lapses). */
  function recordAcceptance(kind: TermsKind, ownerId: string, locale: TermsLocale, sourceId: string | null = null) {
    // Terms off: nothing is recorded, and nothing lapses.
    if (!TERMS_ENFORCED) return null;
    const now = new Date();
    const expiresAt = acceptanceExpiry(now);
    db.termsAcceptances.push({
      kind,
      ownerId,
      sourceId,
      termsVersion: TERMS_VERSIONS[kind],
      locale,
      acceptedAt: now.toISOString(),
      expiresAt,
    });
    return expiresAt;
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
  const app = new Hono<Env>();
  app.use(
    "*",
    cors({
      origin: (origin) =>
        origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")
          ? origin
          : undefined,
      credentials: true,
    }),
  );

  app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  app.use("*", async (c, next) => {
    if (c.req.method === "OPTIONS" || openPath(c.req.method, c.req.path)) return next();
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const actor = session ? db.actors.get(session.user.id) : undefined;
    if (!actor) {
      return c.json({ detail: "Authentication credentials were not provided." }, 401);
    }
    if (!actor.isActive && !INACTIVE_ALLOWED_PATHS.has(c.req.path)) {
      return c.json({ detail: "Your account is not active." }, 403);
    }
    c.set("actor", actor);
    await next();
  });

  // Terms off (a self-hosted lite install): every terms route answers 404, as the API does.
  const TERMS_ROUTE = /^\/(terms|meshes\/terms|sources\/terms|sinks\/terms|owners\/me\/terms-acceptance|(meshes|sources|sinks)\/[^/]+\/terms-acceptance)$/;
  app.use("*", async (c, next) => {
    if (!TERMS_ENFORCED && TERMS_ROUTE.test(c.req.path)) {
      return c.json({ detail: "Terms are not enforced on this instance" }, 404);
    }
    await next();
  });

  app.get("/health", (c) => c.json({ status: "ok" }));
  app.get("/owners/csrf-cookie", (c) => c.json({ detail: "ok" }));

  app.post("/owners/login", async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zOwnersLoginCreateData.safeParse({ body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    try {
      const result = await auth.api.signInEmail({
        body: { email: parsed.data.body.email, password: parsed.data.body.password },
        headers: c.req.raw.headers,
        returnHeaders: true,
      });
      const actor = db.actors.get(result.response.user.id);
      if (!actor) return c.json({ detail: "Invalid email or password" }, 401);
      // Like the API, an unverified owner is signed in and only reaches its own account.
      applySetCookie(c, result.headers);
      stampLogin(actor);
      const verification = db.verifications.get(actor.id) ?? NO_VERIFICATION;
      return c.json(ownerProfileJson(actor, await devicesJson(actor, await devicesFor(db, actor)), verification, ownerTerms(actor.id)));
    } catch {
      return c.json({ detail: "Invalid email or password" }, 401);
    }
  });

  app.post("/owners/request-password-reset", async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zOwnersRequestPasswordResetCreateData.safeParse({ body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const actor = [...db.actors.values()].find((candidate) => candidate.email === parsed.data.body.email);
    if (actor) {
      for (const [existingToken, entry] of db.passwordResetTokens) {
        if (entry.ownerId === actor.id) db.passwordResetTokens.delete(existingToken);
      }
      const token = newId();
      db.passwordResetTokens.set(token, { ownerId: actor.id, sentAt: nowIso() });
      console.info(`[mock] password reset link for ${actor.email}: /reset-password?token=${token}`);
    }
    return c.json({ detail: "If an account exists for that email, a reset link has been sent." });
  });

  app.post("/owners/reset-password", async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zOwnersResetPasswordCreateData.safeParse({ body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const { token, new_password: newPassword } = parsed.data.body;
    const entry = db.passwordResetTokens.get(token);
    const expired =
      !entry || Date.now() > Date.parse(entry.sentAt) + PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000;
    if (expired) {
      return c.json({ token: ["Invalid or expired reset link, request a new one"] }, 400);
    }
    await setOwnerPassword(auth, entry.ownerId, newPassword);
    db.passwordResetTokens.delete(token);
    return c.json({ detail: "Password reset" });
  });

  app.post("/owners", async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zOwnersCreateData.safeParse({ body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const { name, email, password } = parsed.data.body;
    const termsError = termsVersionError("account", parsed.data.body.terms_version);
    if (Object.keys(termsError).length) return c.json(termsError, 400);
    let result;
    try {
      result = await auth.api.signUpEmail({
        body: { email, password, name },
        headers: c.req.raw.headers,
        returnHeaders: true,
      });
    } catch {
      return c.json({ detail: "Could not create the account. Check the details and try again." }, 400);
    }
    applySetCookie(c, result.headers);
    const now = nowIso();
    const actor: Actor = {
      id: result.response.user.id,
      email,
      name,
      role: "owner",
      isActive: false,
      createdAt: now,
      // Signup is a session sign-in, as in the API.
      lastLogin: now,
      alarmEmailCooldownSeconds: null,
      statusAlertsEnabled: false,
    };
    db.actors.set(actor.id, actor);
    // Signing up accepts the current account terms; they don't lapse, as an account stores no mesh data.
    recordAcceptance("account", actor.id, termsLocale(parsed.data.body.terms_locale));
    if (TERMS_ENFORCED) db.accountTerms.set(actor.id, TERMS_VERSIONS.account);
    const token = newId();
    db.verificationTokens.set(token, actor.id);
    const verification = { emailVerifiedAt: null, emailVerificationSentAt: now };
    db.verifications.set(actor.id, verification);
    console.info(`[mock] verification link for ${email}: /verify-email?token=${token}`);
    return c.json(ownerWithApiKeyJson(actor, verification, `mtt_mock_${token}`, ownerTerms(actor.id)), 201);
  });

  app.get("/owners/verify-email", (c) => {
    const token = c.req.query("token") ?? "";
    const ownerId = db.verificationTokens.get(token);
    const actor = ownerId ? db.actors.get(ownerId) : undefined;
    if (!ownerId || !actor) {
      return c.json({ detail: "This verification link is invalid or has expired." }, 400);
    }
    db.verificationTokens.delete(token);
    actor.isActive = true;
    const now = nowIso();
    const previous = db.verifications.get(ownerId) ?? NO_VERIFICATION;
    db.verifications.set(ownerId, { ...previous, emailVerifiedAt: now });
    return c.json({ detail: "Your email address has been verified." });
  });

  app.post("/owners/me/resend-verification", (c) => {
    const actor = c.get("actor");
    const info = db.verifications.get(actor.id) ?? NO_VERIFICATION;
    if (info.emailVerificationSentAt) {
      const elapsedSeconds = (Date.now() - Date.parse(info.emailVerificationSentAt)) / 1000;
      if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds);
        return c.json({ detail: `Please wait ${waitSeconds}s before requesting another email.` }, 429);
      }
    }
    for (const [existingToken, ownerId] of db.verificationTokens) {
      if (ownerId === actor.id) db.verificationTokens.delete(existingToken);
    }
    const token = newId();
    db.verificationTokens.set(token, actor.id);
    const now = nowIso();
    db.verifications.set(actor.id, { ...info, emailVerificationSentAt: now });
    console.info(`[mock] verification link for ${actor.email}: /verify-email?token=${token}`);
    return c.json({ detail: "ok" });
  });

  app.post("/owners/logout", async (c) => {
    const result = await auth.api.signOut({
      headers: c.req.raw.headers,
      returnHeaders: true,
    });
    applySetCookie(c, result.headers);
    return c.json({ detail: "ok" });
  });

  app.get("/owners/me", async (c) => {
    const actor = c.get("actor");
    const verification = db.verifications.get(actor.id) ?? NO_VERIFICATION;
    return c.json(ownerProfileJson(actor, await devicesJson(actor, await devicesFor(db, actor)), verification, ownerTerms(actor.id)));
  });

  app.put("/owners/me", async (c) => {
    const actor = c.get("actor");
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zOwnersMeUpdateData.safeParse({ body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const patch = parsed.data.body ?? {};
    if (patch.name !== undefined) actor.name = patch.name;
    if (patch.alarm_email_cooldown_seconds !== undefined) {
      actor.alarmEmailCooldownSeconds = patch.alarm_email_cooldown_seconds;
    }
    if (patch.status_alerts_enabled !== undefined) actor.statusAlertsEnabled = patch.status_alerts_enabled;
    if (patch.email !== undefined && patch.email !== actor.email) {
      const taken = [...db.actors.values()].some(
        (other) => other.id !== actor.id && other.email === patch.email,
      );
      if (taken) return c.json({ detail: "That email address is already in use." }, 400);
      actor.email = patch.email;
      actor.isActive = false;
      for (const [existingToken, ownerId] of db.verificationTokens) {
        if (ownerId === actor.id) db.verificationTokens.delete(existingToken);
      }
      const token = newId();
      db.verificationTokens.set(token, actor.id);
      db.verifications.set(actor.id, { emailVerifiedAt: null, emailVerificationSentAt: nowIso() });
      console.info(`[mock] verification link for ${actor.email}: /verify-email?token=${token}`);
    }
    const verification = db.verifications.get(actor.id) ?? NO_VERIFICATION;
    return c.json(ownerReadJson(actor, verification, ownerTerms(actor.id)));
  });

  app.delete("/owners/me", async (c) => {
    const actor = c.get("actor");
    const ownedMeshes = (await db.meshes.list()).filter((mesh) => mesh.ownerId === actor.id);
    for (const mesh of ownedMeshes) {
      const devices = await db.devices.list({ meshId: mesh.id });
      for (const device of devices) await deleteDevice(device.uuid);
      detachFromSinks({ meshId: mesh.id });
      await db.meshes.delete(mesh.id);
    }
    // The owner's sinks go too: their credentials are revoked and consumers disconnected.
    for (const sink of await db.sinks.list()) {
      if (sink.createdById === actor.id) await db.sinks.delete(sink.id);
    }
    // Blueprints other owners' devices still run are kept, ownerless and left to superusers.
    db.blueprints = db.blueprints.flatMap((blueprint) => {
      if (blueprint.ownerId !== actor.id) return [blueprint];
      return db.postprocessings.some((row) => row.blueprintId === blueprint.id) ? [{ ...blueprint, ownerId: null }] : [];
    });
    for (const [existingToken, ownerId] of db.verificationTokens) {
      if (ownerId === actor.id) db.verificationTokens.delete(existingToken);
    }
    db.verifications.delete(actor.id);
    db.actors.delete(actor.id);
    const result = await auth.api.signOut({ headers: c.req.raw.headers, returnHeaders: true });
    applySetCookie(c, result.headers);
    return c.body(null, 204);
  });

  app.get("/owners", (c) => {
    const actor = c.get("actor");
    const rows = [...db.actors.values()];
    if (actor.role === "superuser") {
      return c.json(rows.map((row) => ownerReadJson(row, db.verifications.get(row.id) ?? NO_VERIFICATION, ownerTerms(row.id))));
    }
    return c.json(rows.map(ownerPublicJson));
  });

  app.get("/owners/:owner_id", (c) => {
    const actor = c.get("actor");
    const subject = db.actors.get(c.req.param("owner_id"));
    if (!subject) return c.json({ detail: "Not found" }, 404);
    if (canReadOwnerEmail(actor, subject)) {
      return c.json(ownerReadJson(subject, db.verifications.get(subject.id) ?? NO_VERIFICATION, ownerTerms(subject.id)));
    }
    return c.json(ownerPublicJson(subject));
  });

  app.get("/meshes", async (c) => {
    const actor = c.get("actor");
    const owned = ["true", "1"].includes((c.req.query("owned") ?? "").toLowerCase());
    const sourceId = c.req.query("source_id");
    if (sourceId !== undefined && !/^[0-9a-f-]{36}$/i.test(sourceId)) {
      return c.json({ source_id: ["Must be a UUID."] }, 400);
    }
    const meshes = (await visibleMeshes(db, actor, queryFilters(c, ["label", "channel_id"]))).filter(
      (mesh) => (!owned || mesh.ownerId === actor.id) && (!sourceId || mesh.sourceId === sourceId),
    );
    return c.json(meshes.map((m) => meshJson(m, canSeePsk(actor, m), canSeeMeshSource(actor, m))));
  });

  app.post("/meshes", async (c) => {
    const actor = c.get("actor");
    if (actor.role === "staff") {
      return c.json({ detail: "You do not have permission to perform this action." }, 403);
    }
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zMeshesCreateData.safeParse({ body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const sourceId = parsed.data.body.source_id ?? null;
    if (sourceId !== null && !(await canAttachSource(actor, sourceId, null))) {
      return c.json({ source_id: [`Invalid pk "${sourceId}" - object does not exist.`] }, 400);
    }
    // On the default broker the mesh's own terms apply; on a source, the source's.
    if (sourceId === null) {
      const termsError = termsVersionError("mesh", parsed.data.body.terms_version);
      if (Object.keys(termsError).length) return c.json(termsError, 400);
    }
    const mesh = await db.meshes.insert({
      channelId: parsed.data.body.channel_id,
      pskB64: parsed.data.body.psk_b64,
      label: parsed.data.body.label ?? null,
      ownerId: actor.id,
      sourceId,
    });
    if (sourceId === null) {
      mesh.termsAcceptedVersion = TERMS_ENFORCED ? TERMS_VERSIONS.mesh : null;
      mesh.termsExpiresAt = recordAcceptance("mesh", actor.id, termsLocale(parsed.data.body.terms_locale));
    }
    return c.json(meshJson(mesh, true), 201);
  });

  app.get("/meshes/terms", (c) => c.json(termsJson("mesh", termsLocale(c.req.query("locale")))));

  app.post("/meshes/:mesh_id/terms-acceptance", async (c) => {
    const actor = c.get("actor");
    const mesh = await meshForRead(db, actor, c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Not found" }, 404);
    if (mesh.ownerId !== actor.id) {
      return c.json({ detail: "Only the mesh's owner can accept its terms" }, 403);
    }
    if (mesh.sourceId) {
      return c.json({ detail: "This mesh is on a source; its source's terms apply" }, 409);
    }
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zMeshesTermsAcceptanceCreateData.safeParse({ path: { mesh_id: mesh.id }, body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const termsError = termsVersionError("mesh", parsed.data.body.terms_version);
    if (Object.keys(termsError).length) return c.json(termsError, 400);
    // Renewing resumes a paused mesh and cancels the deletion its lapse scheduled.
    if (mesh.pausedAt) cancelMeshDeletions([mesh.id], "terms_lapsed", null);
    mesh.termsAcceptedVersion = TERMS_VERSIONS.mesh;
    mesh.termsExpiresAt = recordAcceptance("mesh", actor.id, termsLocale(parsed.data.body.terms_locale));
    mesh.pausedAt = null;
    return c.json(meshJson(mesh, true), 201);
  });

  app.get("/meshes/:mesh_id", async (c) => {
    const actor = c.get("actor");
    const mesh = await meshForRead(db, actor, c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Not found" }, 404);
    return c.json(meshJson(mesh, canSeePsk(actor, mesh), canSeeMeshSource(actor, mesh)));
  });

  app.get("/meshes/:mesh_id/devices", async (c) => {
    const actor = c.get("actor");
    const mesh = await meshForRead(db, actor, c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Not found" }, 404);
    const variants = telemetryVariantQuery(c);
    if ("error" in variants) return c.json(variants.error, 400);
    const devices = await db.devices.list({ meshId: mesh.id });
    return c.json(
      await devicesJson(
        actor,
        devices.filter((device) => visibleToReader(actor, mesh, device) && reportsVariants(device, variants.filter)),
      ),
    );
  });

  app.put("/meshes/:mesh_id", async (c) => {
    const actor = c.get("actor");
    const mesh = await meshForRead(db, actor, c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Not found" }, 404);
    if (!canWriteMesh(actor, mesh)) {
      return c.json({ detail: "You do not have permission to perform this action." }, 403);
    }
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zMeshesUpdateData.safeParse({ path: { mesh_id: mesh.id }, body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const patch = parsed.data.body ?? {};
    if (patch.source_id && !(await canAttachSource(actor, patch.source_id, mesh.sourceId))) {
      return c.json({ source_id: [`Invalid pk "${patch.source_id}" - object does not exist.`] }, 400);
    }
    // Moving onto the default broker needs the mesh terms, unless it already holds a current acceptance.
    const toDefault = patch.source_id === null && mesh.sourceId !== null;
    if (toDefault && !meshTermsCurrent(mesh)) {
      const termsError = termsVersionError("mesh", patch.terms_version);
      if (Object.keys(termsError).length) return c.json(termsError, 400);
    }
    const previousSource = mesh.sourceId;
    const updated = await db.meshes.update(mesh.id, {
      channelId: patch.channel_id,
      pskB64: patch.psk_b64,
      label: patch.label,
      isPublic: patch.is_public,
      sourceId: patch.source_id,
    });
    if (!updated) return c.json({ detail: "Not found" }, 404);
    if (toDefault && patch.terms_version === TERMS_VERSIONS.mesh) {
      // As a renewal: resumes a mesh an earlier lapse paused, and cancels that lapse's deletion.
      if (updated.pausedAt) cancelMeshDeletions([updated.id], "terms_lapsed", null);
      updated.termsAcceptedVersion = TERMS_ENFORCED ? TERMS_VERSIONS.mesh : null;
      updated.termsExpiresAt = recordAcceptance("mesh", actor.id, termsLocale(patch.terms_locale));
      updated.pausedAt = null;
    }
    if (patch.source_id !== undefined && patch.source_id !== previousSource) {
      // Readings bridged so far belonged to the old source's service.
      if (previousSource) {
        scheduleMeshDeletion(updated.id, "source_detached", {
          sourceId: previousSource,
          requestedById: actor.id,
          dataUntil: nowIso(),
        });
      }
      if (updated.sourceId) cancelMeshDeletions([updated.id], "source_detached", updated.sourceId);
    }
    return c.json(meshJson(updated, canSeePsk(actor, updated), canSeeMeshSource(actor, updated)));
  });

  app.delete("/meshes/:mesh_id", async (c) => {
    const actor = c.get("actor");
    const mesh = await meshForRead(db, actor, c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Not found" }, 404);
    if (!canWriteMesh(actor, mesh)) {
      return c.json({ detail: "You do not have permission to perform this action." }, 403);
    }
    const devices = await db.devices.list({ meshId: mesh.id });
    for (const device of devices) await deleteDevice(device.uuid);
    detachFromSinks({ meshId: mesh.id });
    await db.meshes.delete(mesh.id);
    scheduleMeshDeletion(mesh.id, "mesh_deleted", { sourceId: mesh.sourceId, requestedById: actor.id });
    return c.body(null, 204);
  });

  app.get("/devices", async (c) => {
    const actor = c.get("actor");
    const variants = telemetryVariantQuery(c);
    if ("error" in variants) return c.json(variants.error, 400);
    const devices = (await devicesFor(db, actor)).filter(
      (device) =>
        matchesDeviceFilter(device, {
          extra: queryFilters(c, ["mesh_id", "is_gateway", "is_allowed", "has_postprocessing", "label"]),
        }) && reportsVariants(device, variants.filter),
    );
    return c.json(await devicesJson(actor, devices));
  });

  app.post("/devices", async (c) => {
    const actor = c.get("actor");
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zDevicesCreateData.safeParse({ body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const mesh = await db.meshes.get(parsed.data.body.mesh_id);
    if (!mesh) return c.json({ detail: "Mesh not found" }, 400);
    if (!canWriteMesh(actor, mesh)) {
      return c.json({ detail: "You do not have permission to perform this action." }, 403);
    }
    const device = await db.devices.insert({
      nodeId: parsed.data.body.node_id,
      meshId: parsed.data.body.mesh_id,
      isGateway: parsed.data.body.is_gateway,
      label: parsed.data.body.label ?? null,
      name: parsed.data.body.name ?? null,
      shortName: parsed.data.body.short_name ?? null,
      latitude: parsed.data.body.latitude ?? null,
      longitude: parsed.data.body.longitude ?? null,
    });
    return c.json(await deviceOut(actor, device), 201);
  });

  app.get("/devices/:device_uuid", async (c) => {
    const actor = c.get("actor");
    const device = await deviceForRead(db, actor, c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    return c.json(await deviceOut(actor, device));
  });

  app.put("/devices/:device_uuid", async (c) => {
    const actor = c.get("actor");
    const existing = await db.devices.get(c.req.param("device_uuid"));
    if (!existing) return c.json({ detail: "Not found" }, 404);
    const mesh = await meshForRead(db, actor, existing.meshId);
    if (!mesh) return c.json({ detail: "Not found" }, 404);
    if (!canWriteMesh(actor, mesh)) {
      return c.json({ detail: "You do not have permission to perform this action." }, 403);
    }
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zDevicesUpdateData.safeParse({
      path: { device_uuid: c.req.param("device_uuid") },
      body,
    });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const patch = parsed.data.body ?? {};
    if (patch.archive_enabled && !existing.archiveEnabled) {
      const owner = db.actors.get(mesh.ownerId);
      if (!ARCHIVE_ENABLED) return c.json({ archive_enabled: ["This instance has no archive."] }, 400);
      if (!owner || !archivesFor(owner)) {
        return c.json({ archive_enabled: ["Only devices on a mesh owned by an operator can be archived."] }, 400);
      }
    }
    const lat = patch.latitude;
    const lon = patch.longitude;
    if (patch.archive_enabled !== undefined) existing.setArchive(patch.archive_enabled, actor.id, nowIso());
    const device = await db.devices.update(c.req.param("device_uuid"), {
      label: patch.label,
      name: patch.name,
      shortName: patch.short_name,
      latitude: lat,
      longitude: lon,
      isAllowed: patch.is_allowed,
      isGateway: patch.is_gateway,
      absenceDetectionEnabled: patch.absence_detection_enabled,
      readingIntervalSeconds: patch.reading_interval_seconds,
      publishIntervalSeconds: patch.publish_interval_seconds,
      // Registry rule: sending both keys pins the location unless both are
      // null, which hands it back to the node's own position reports.
      locationOverridden: lat !== undefined && lon !== undefined ? lat != null || lon != null : undefined,
    });
    if (!device) return c.json({ detail: "Not found" }, 404);
    syncArchive(device, mesh);
    return c.json(await deviceOut(actor, device));
  });

  app.get("/devices/:device_uuid/measurements", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    return c.json((await deviceChannels(db, device)).map((channel) => deviceMeasurementJson(db, device, channel)));
  });

  app.get("/devices/:device_uuid/measurements/:measurement_id", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const found = await findDeviceMeasurement(db, device, c.req.param("measurement_id"));
    if (!found) return c.json({ detail: "Not found" }, 404);
    return c.json(deviceMeasurementJson(db, device, found));
  });

  app.put("/devices/:device_uuid/measurements/:measurement_id", async (c) => {
    const actor = c.get("actor");
    const device = await deviceForRead(db, actor, c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const mesh = await db.meshes.get(device.meshId);
    if (!mesh || !canWriteMesh(actor, mesh)) {
      return c.json({ detail: "You do not have permission to perform this action." }, 403);
    }
    const found = await findDeviceMeasurement(db, device, c.req.param("measurement_id"));
    if (!found) return c.json({ detail: "Not found" }, 404);
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zDevicesMeasurementsUpdateData.safeParse({
      path: { device_uuid: device.uuid, measurement_id: c.req.param("measurement_id") },
      body,
    });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const patch = parsed.data.body ?? {};
    if ("enabled_detectors" in patch) {
      const enabledDetectors = patch.enabled_detectors ?? null;
      if (enabledDetectors) {
        const unknownNames = enabledDetectors.filter((name) => !MEASUREMENT_DETECTORS.includes(name));
        if (unknownNames.length) {
          return c.json(
            {
              detail: `Unknown detector(s) ${unknownNames.join(", ")}. Valid: ${MEASUREMENT_DETECTORS.join(", ")}`,
            },
            400,
          );
        }
      }
      db.detectorOverrides.set(c.req.param("measurement_id"), enabledDetectors);
    }
    if ("valid_min" in patch || "valid_max" in patch) {
      const validMin = patch.valid_min ?? null;
      const validMax = patch.valid_max ?? null;
      if ((validMin === null) !== (validMax === null)) {
        return c.json({ detail: "valid_min and valid_max must be set or cleared together." }, 400);
      }
      db.deviceMeasurementRanges.set(c.req.param("measurement_id"), { validMin, validMax });
    }
    return c.json(deviceMeasurementJson(db, device, found));
  });

  app.get("/detectors", (c) => c.json(DETECTOR_CATALOG));

  app.get("/devices/:device_uuid/telemetry-variants", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const reported = db.deviceTelemetryVariants.get(device.uuid) ?? [];
    return c.json(
      TELEMETRY_VARIANTS.filter((variant) => reported.includes(variant.id))
        .sort((a, b) => reported.indexOf(a.id) - reported.indexOf(b.id))
        .map((variant) => ({
          // The Porch node's environment link keeps its fixed id.
          id: device.uuid === DEVICE_NODE_ID && variant.id === VARIANT_ENV_ID ? DEVICE_VARIANT_ID : newId(),
          telemetry_variant: telemetryVariantJson(variant, device.createdAt),
          first_seen: device.createdAt,
          last_seen: device.lastSeen,
        })),
    );
  });

  app.get("/telemetry-variants", (c) =>
    c.json(TELEMETRY_VARIANTS.map((variant) => telemetryVariantJson(variant, "2026-01-01T00:00:00.000Z"))),
  );

  app.get("/measurements", async (c) => {
    const rows = await db.measurements.list();
    return c.json(rows.map(measurementJson));
  });

  app.get("/algorithms", (c) => c.json(ALGORITHMS));

  const OPERATORS_ONLY = { detail: "Only an operator may access sources" };

  app.get("/sources", async (c) => {
    const actor = c.get("actor");
    if (!canManageSources(actor)) return c.json(OPERATORS_ONLY, 403);
    return c.json(visibleSources(actor, await db.sources.list()).map((source) => sourceReadJson(source)));
  });

  app.post("/sources", async (c) => {
    const actor = c.get("actor");
    if (!canManageSources(actor)) return c.json(OPERATORS_ONLY, 403);
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zSourcesCreateData.safeParse({ body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const input = parsed.data.body;
    const errors = {
      ...sourceErrors(input),
      ...credentialErrors(input.username, input.password),
      ...termsVersionError("source", input.terms_version),
    };
    if (Object.keys(errors).length) return c.json(errors, 400);
    const source = await db.sources.insert({
      label: input.label ?? null,
      server: input.server.trim(),
      ssl: input.ssl,
      username: input.username ?? null,
      password: input.password || null,
      topic: input.topic.trim(),
      qos: input.qos,
      createdById: actor.id,
    });
    if (bridgeFails(source)) {
      await db.sources.delete(source.id);
      return c.json({ detail: "Failed to create the bridge, source NOT created: connection refused" }, 502);
    }
    // Recorded only once the bridge is up, and kept if the source is deleted later.
    source.termsAcceptedVersion = TERMS_ENFORCED ? TERMS_VERSIONS.source : null;
    source.termsExpiresAt = recordAcceptance("source", actor.id, termsLocale(input.terms_locale), source.id);
    return c.json(sourceReadJson(source), 201);
  });

  app.get("/sources/terms", (c) => {
    const actor = c.get("actor");
    if (!canManageSources(actor)) return c.json(OPERATORS_ONLY, 403);
    return c.json(termsJson("source", termsLocale(c.req.query("locale"))));
  });

  app.post("/sources/:source_id/terms-acceptance", async (c) => {
    const actor = c.get("actor");
    if (!canManageSources(actor)) return c.json(OPERATORS_ONLY, 403);
    const source = await sourceForOperator(actor, c.req.param("source_id"));
    if (!source) return c.json({ detail: "Source not found" }, 404);
    if (source.createdById !== actor.id) {
      return c.json({ detail: "Only the operator who created this source can accept its terms" }, 403);
    }
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zSourcesTermsAcceptanceCreateData.safeParse({ path: { source_id: source.id }, body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const termsError = termsVersionError("source", parsed.data.body.terms_version);
    if (Object.keys(termsError).length) return c.json(termsError, 400);
    if (source.pausedAt && bridgeFails(source)) {
      return c.json({ detail: "Failed to restart the bridge, terms NOT renewed: connection refused" }, 502);
    }
    // Renewing restarts a paused bridge and cancels the deletion of its meshes' data.
    if (source.pausedAt) {
      const attached = (await db.meshes.list()).filter((mesh) => mesh.sourceId === source.id);
      cancelMeshDeletions(attached.map((mesh) => mesh.id), "terms_lapsed", source.id);
    }
    source.termsAcceptedVersion = TERMS_ENFORCED ? TERMS_VERSIONS.source : null;
    source.termsExpiresAt = recordAcceptance("source", actor.id, termsLocale(parsed.data.body.terms_locale), source.id);
    source.pausedAt = null;
    return c.json(sourceReadJson(source), 201);
  });

  app.get("/sources/:source_id", async (c) => {
    const actor = c.get("actor");
    if (!canManageSources(actor)) return c.json(OPERATORS_ONLY, 403);
    const source = await sourceForOperator(actor, c.req.param("source_id"));
    if (!source) return c.json({ detail: "Source not found" }, 404);
    return c.json(sourceReadJson(source));
  });

  app.put("/sources/:source_id", async (c) => {
    const actor = c.get("actor");
    if (!canManageSources(actor)) return c.json(OPERATORS_ONLY, 403);
    const source = await sourceForOperator(actor, c.req.param("source_id"));
    if (!source) return c.json({ detail: "Source not found" }, 404);
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zSourcesUpdateData.safeParse({ path: { source_id: source.id }, body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    // Any subset of the fields; "" or null removes the password and keeps the username.
    const input = parsed.data.body ?? {};
    const server = input.server?.trim();
    const topic = input.topic?.trim();
    const username = input.username === undefined ? source.username : input.username;
    const password = input.password === undefined ? source.password : input.password || null;
    const errors = {
      ...sourceErrors({ server, topic, qos: input.qos }),
      ...credentialErrors(username, password),
    };
    if (Object.keys(errors).length) return c.json(errors, 400);
    if (bridgeFails({ server: server ?? source.server })) {
      return c.json({ detail: "Failed to reconfigure the bridge, rolled back: connection refused" }, 502);
    }
    const updated = await db.sources.update(source.id, {
      label: input.label,
      server,
      ssl: input.ssl,
      username: input.username,
      password: input.password === undefined ? undefined : password,
      topic,
      qos: input.qos,
    });
    if (!updated) return c.json({ detail: "Source not found" }, 404);
    return c.json(sourceReadJson(updated));
  });

  app.delete("/sources/:source_id", async (c) => {
    const actor = c.get("actor");
    if (!canManageSources(actor)) return c.json(OPERATORS_ONLY, 403);
    const source = await sourceForOperator(actor, c.req.param("source_id"));
    if (!source) return c.json({ detail: "Source not found" }, 404);
    if ((await db.meshes.list()).some((mesh) => mesh.sourceId === source.id)) {
      return c.json({ detail: "Source has meshes attached; move or delete them first" }, 409);
    }
    await db.sources.delete(source.id);
    return c.body(null, 204);
  });

  // Sinks: an operator's consumers subscribe on this instance's broker. No EMQX, no sinks.
  const SINK_OPERATORS_ONLY = { detail: "Only an operator may access sinks" };
  const NO_SINKS = { detail: "Not found" };
  const sinkConnections = (sink: Sink) => db.sinks.connections.get(sink.id) ?? 0;
  const uniqueIds = (ids: readonly string[] | undefined) => (ids ? [...new Set(ids)] : undefined);

  app.get("/sinks", async (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    return c.json(visibleSinks(actor, await db.sinks.list()).map((sink) => sinkReadJson(sink, sinkConnections(sink))));
  });

  app.post("/sinks", async (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zSinksCreateData.safeParse({ body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const input = parsed.data.body;
    const errors = {
      ...(input.streams && input.streams.length === 0 ? { streams: ["This list may not be empty."] } : {}),
      ...(await sinkTargetErrors(actor, input)),
      ...termsVersionError("sink", input.terms_version),
    };
    if (Object.keys(errors).length) return c.json(errors, 400);
    const sink = await db.sinks.insert({
      label: input.label?.trim() || null,
      streams: orderStreams(input.streams ?? ["decoded"]),
      meshIds: uniqueIds(input.mesh_ids),
      deviceIds: uniqueIds(input.device_ids),
      createdById: actor.id,
    });
    sink.termsAcceptedVersion = TERMS_ENFORCED ? TERMS_VERSIONS.sink : null;
    sink.termsExpiresAt = recordAcceptance("sink", actor.id, termsLocale(input.terms_locale));
    return c.json(sinkCredentialsJson(sink, 0), 201);
  });

  app.get("/sinks/terms", (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    return c.json(termsJson("sink", termsLocale(c.req.query("locale"))));
  });

  app.post("/sinks/:sink_id/terms-acceptance", async (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    const sink = await sinkForOperator(actor, c.req.param("sink_id"));
    if (!sink) return c.json({ detail: "Sink not found" }, 404);
    if (sink.createdById !== actor.id) {
      return c.json({ detail: "Only the operator who created this sink can accept its terms" }, 403);
    }
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zSinksTermsAcceptanceCreateData.safeParse({ path: { sink_id: sink.id }, body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const termsError = termsVersionError("sink", parsed.data.body.terms_version);
    if (Object.keys(termsError).length) return c.json(termsError, 400);
    // Renewing resumes a paused sink with the same credentials; a sink stores nothing to restore.
    sink.termsAcceptedVersion = TERMS_ENFORCED ? TERMS_VERSIONS.sink : null;
    sink.termsExpiresAt = recordAcceptance("sink", actor.id, termsLocale(parsed.data.body.terms_locale));
    sink.pausedAt = null;
    return c.json(sinkReadJson(sink, sinkConnections(sink)), 201);
  });

  app.get("/sinks/:sink_id", async (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    const sink = await sinkForOperator(actor, c.req.param("sink_id"));
    if (!sink) return c.json({ detail: "Sink not found" }, 404);
    return c.json(sinkReadJson(sink, sinkConnections(sink)));
  });

  app.put("/sinks/:sink_id", async (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    const sink = await sinkForOperator(actor, c.req.param("sink_id"));
    if (!sink) return c.json({ detail: "Sink not found" }, 404);
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zSinksUpdateData.safeParse({ path: { sink_id: sink.id }, body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    // Any subset; a list sent replaces the current one, a list left out is kept.
    const input = parsed.data.body ?? {};
    const errors = {
      ...(input.streams && input.streams.length === 0 ? { streams: ["This list may not be empty."] } : {}),
      ...(await sinkTargetErrors(actor, input)),
    };
    if (Object.keys(errors).length) return c.json(errors, 400);
    const updated = await db.sinks.update(sink.id, {
      label: input.label === undefined ? undefined : input.label?.trim() || null,
      streams: input.streams ? orderStreams(input.streams) : undefined,
      meshIds: uniqueIds(input.mesh_ids),
      deviceIds: uniqueIds(input.device_ids),
    });
    if (!updated) return c.json({ detail: "Sink not found" }, 404);
    return c.json(sinkReadJson(updated, sinkConnections(updated)));
  });

  app.post("/sinks/:sink_id/credentials", async (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    const sink = await sinkForOperator(actor, c.req.param("sink_id"));
    if (!sink) return c.json({ detail: "Sink not found" }, 404);
    // A new password, and connected consumers are dropped.
    const rotated = await db.sinks.rotate(sink.id);
    if (!rotated) return c.json({ detail: "Sink not found" }, 404);
    return c.json(sinkCredentialsJson(rotated, 0));
  });

  app.delete("/sinks/:sink_id", async (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    const sink = await sinkForOperator(actor, c.req.param("sink_id"));
    if (!sink) return c.json({ detail: "Sink not found" }, 404);
    if (sink.meshIds.length > 0 || sink.deviceIds.length > 0) {
      return c.json({ detail: "Sink has meshes or devices attached; detach them first" }, 409);
    }
    await db.sinks.delete(sink.id);
    return c.body(null, 204);
  });

  app.get("/data-deletions", (c) => {
    const actor = c.get("actor");
    if (!canSeeDataDeletions(actor)) {
      return c.json({ detail: "You do not have permission to perform this action." }, 403);
    }
    const wanted = c.req.query("status") ?? "pending";
    if (!["pending", "cancelled", "done", "all"].includes(wanted)) {
      return c.json({ status: ["Must be pending, cancelled, done or all."] }, 400);
    }
    const meshId = c.req.query("mesh_id");
    const rows = db.dataDeletions
      .filter((row) => (wanted === "all" || row.status === wanted) && (!meshId || row.meshId === meshId))
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    return c.json(rows.map(dataDeletionJson));
  });

  app.get("/terms", (c) => c.json(termsJson("account", termsLocale(c.req.query("locale")))));

  app.post("/owners/me/terms-acceptance", async (c) => {
    const actor = c.get("actor");
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zOwnersMeTermsAcceptanceCreateData.safeParse({ body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const termsError = termsVersionError("account", parsed.data.body.terms_version);
    if (Object.keys(termsError).length) return c.json(termsError, 400);
    // Accepting changed account terms; nothing is paused by them.
    recordAcceptance("account", actor.id, termsLocale(parsed.data.body.terms_locale));
    if (TERMS_ENFORCED) db.accountTerms.set(actor.id, TERMS_VERSIONS.account);
    const verification = db.verifications.get(actor.id) ?? NO_VERIFICATION;
    return c.json(ownerReadJson(actor, verification, ownerTerms(actor.id)), 201);
  });

  app.get("/owners/me/operator-request", (c) => {
    const actor = c.get("actor");
    const latest = db.operatorRequests
      .filter((row) => row.ownerId === actor.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!latest) return c.json({ detail: "No operator request" }, 404);
    return c.json(operatorRequestJson(latest));
  });

  app.post("/owners/me/operator-request", async (c) => {
    const actor = c.get("actor");
    if (!canRequestOperator(actor)) return c.json({ detail: "You are already an operator" }, 409);
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zOwnersMeOperatorRequestCreateData.safeParse({ body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const reason = parsed.data.body.reason.trim();
    if (!reason) return c.json({ reason: ["This field may not be blank."] }, 400);
    if (db.operatorRequests.some((row) => row.ownerId === actor.id && row.status === "pending")) {
      return c.json({ detail: "You already have a pending operator request" }, 409);
    }
    const row = {
      id: newId(),
      ownerId: actor.id,
      reason,
      status: "pending" as const,
      decidedById: null,
      decisionNote: "",
      decidedAt: null,
      createdAt: nowIso(),
    };
    db.operatorRequests.push(row);
    console.info(`[mock] operator request from ${actor.email}: /console/operator-requests/${row.id}`);
    return c.json(operatorRequestJson(row), 201);
  });

  const SUPERUSERS_ONLY = { detail: "You do not have permission to perform this action." };

  app.get("/operator-requests", (c) => {
    const actor = c.get("actor");
    if (!canDecideOperatorRequests(actor)) return c.json(SUPERUSERS_ONLY, 403);
    const wanted = c.req.query("status") ?? "pending";
    if (!["pending", "approved", "rejected", "all"].includes(wanted)) {
      return c.json({ status: ["Must be pending, approved, rejected or all."] }, 400);
    }
    const rows = db.operatorRequests
      .filter((row) => wanted === "all" || row.status === wanted)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return c.json(rows.map((row) => operatorRequestAdminJson(row, db.actors.get(row.ownerId))));
  });

  app.get("/operator-requests/:request_id", (c) => {
    const actor = c.get("actor");
    if (!canDecideOperatorRequests(actor)) return c.json(SUPERUSERS_ONLY, 403);
    const row = db.operatorRequests.find((candidate) => candidate.id === c.req.param("request_id"));
    if (!row) return c.json({ detail: "Operator request not found" }, 404);
    return c.json(operatorRequestAdminJson(row, db.actors.get(row.ownerId)));
  });

  app.put("/operator-requests/:request_id", async (c) => {
    const actor = c.get("actor");
    if (!canDecideOperatorRequests(actor)) return c.json(SUPERUSERS_ONLY, 403);
    const row = db.operatorRequests.find((candidate) => candidate.id === c.req.param("request_id"));
    if (!row) return c.json({ detail: "Operator request not found" }, 404);
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zOperatorRequestsUpdateData.safeParse({ path: { request_id: row.id }, body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    if (row.status !== "pending") return c.json({ detail: `This request was already ${row.status}` }, 409);
    const approve = parsed.data.body.decision === "approve";
    row.status = approve ? "approved" : "rejected";
    row.decisionNote = parsed.data.body.note ?? "";
    row.decidedById = actor.id;
    row.decidedAt = nowIso();
    const requester = db.actors.get(row.ownerId);
    if (approve && requester?.role === "owner") {
      requester.role = "operator";
      // Archives the owner switched on before are archived again.
      for (const mesh of await db.meshes.list()) {
        if (mesh.ownerId !== requester.id) continue;
        for (const device of await db.devices.list({ meshId: mesh.id })) syncArchive(device, mesh);
      }
    }
    console.info(`[mock] operator request ${row.status} for ${requester?.email ?? row.ownerId}`);
    return c.json(operatorRequestAdminJson(row, requester));
  });

  const NO_PERMISSION = { detail: "You do not have permission to perform this action." };

  function blueprintDeviceCount(blueprintId: string, number: number): number {
    return db.postprocessings.filter((row) => row.blueprintId === blueprintId && row.versionNumber === number).length;
  }

  function blueprintBody(row: BlueprintRow) {
    return blueprintJson(row, (number) => blueprintDeviceCount(row.id, number));
  }

  function readableBlueprint(actor: Actor, blueprintId: string): BlueprintRow | null {
    const row = db.blueprints.find((candidate) => candidate.id === blueprintId);
    return row && canReadBlueprint(actor, row) ? row : null;
  }

  function nameTaken(actor: Actor, name: string, exceptId?: string): boolean {
    return db.blueprints.some((row) => row.ownerId === actor.id && row.name === name && row.id !== exceptId);
  }

  app.get("/postprocessing-blueprints", (c) => {
    const actor = c.get("actor");
    const owned = ["true", "1"].includes(c.req.query("owned")?.toLowerCase() ?? "");
    const rows = visibleBlueprints(actor, db.blueprints).filter((row) => !owned || row.ownerId === actor.id);
    return c.json(rows.map(blueprintBody));
  });

  app.post("/postprocessing-blueprints", async (c) => {
    const actor = c.get("actor");
    if (actor.role === "staff") return c.json(NO_PERMISSION, 403);
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zPostprocessingBlueprintsCreateData.safeParse({ body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const result = versionFromBody(parsed.data.body, 1);
    if ("errors" in result) return c.json(result.errors, 400);
    if (nameTaken(actor, parsed.data.body.name)) {
      return c.json({ detail: `You already have a blueprint named '${parsed.data.body.name}'` }, 409);
    }
    const now = nowIso();
    const row: BlueprintRow = {
      id: newId(),
      name: parsed.data.body.name,
      description: parsed.data.body.description || null,
      isPublic: parsed.data.body.is_public ?? false,
      ownerId: actor.id,
      versions: [result.version],
      createdAt: now,
      updatedAt: now,
    };
    db.blueprints.push(row);
    return c.json(blueprintBody(row), 201);
  });

  app.get("/postprocessing-blueprints/:blueprint_id", (c) => {
    const row = readableBlueprint(c.get("actor"), c.req.param("blueprint_id"));
    if (!row) return c.json({ detail: "Not found" }, 404);
    return c.json(blueprintBody(row));
  });

  app.put("/postprocessing-blueprints/:blueprint_id", async (c) => {
    const actor = c.get("actor");
    const row = readableBlueprint(actor, c.req.param("blueprint_id"));
    if (!row) return c.json({ detail: "Not found" }, 404);
    if (!canWriteBlueprint(actor, row)) return c.json(NO_PERMISSION, 403);
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zPostprocessingBlueprintsUpdateData.safeParse({ path: { blueprint_id: row.id }, body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const patch = parsed.data.body ?? {};
    if (patch.name !== undefined && nameTaken(actor, patch.name, row.id)) {
      return c.json({ detail: `You already have a blueprint named '${patch.name}'` }, 409);
    }
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.description !== undefined) row.description = patch.description || null;
    if (patch.is_public !== undefined) row.isPublic = patch.is_public;
    row.updatedAt = nowIso();
    return c.json(blueprintBody(row));
  });

  app.delete("/postprocessing-blueprints/:blueprint_id", (c) => {
    const actor = c.get("actor");
    const row = readableBlueprint(actor, c.req.param("blueprint_id"));
    if (!row) return c.json({ detail: "Not found" }, 404);
    if (!canWriteBlueprint(actor, row)) return c.json(NO_PERMISSION, 403);
    if (db.postprocessings.some((attached) => attached.blueprintId === row.id)) {
      return c.json({ detail: "Devices still use a version of this blueprint. Detach it from them first" }, 409);
    }
    db.blueprints = db.blueprints.filter((candidate) => candidate.id !== row.id);
    return c.body(null, 204);
  });

  app.get("/postprocessing-blueprints/:blueprint_id/versions", (c) => {
    const row = readableBlueprint(c.get("actor"), c.req.param("blueprint_id"));
    if (!row) return c.json({ detail: "Not found" }, 404);
    return c.json(row.versions.map((version) => blueprintVersionJson(row.id, version, blueprintDeviceCount(row.id, version.number))));
  });

  app.post("/postprocessing-blueprints/:blueprint_id/versions", async (c) => {
    const actor = c.get("actor");
    const row = readableBlueprint(actor, c.req.param("blueprint_id"));
    if (!row) return c.json({ detail: "Not found" }, 404);
    if (!canWriteBlueprint(actor, row)) return c.json(NO_PERMISSION, 403);
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zPostprocessingBlueprintsVersionsCreateData.safeParse({ path: { blueprint_id: row.id }, body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const result = versionFromBody(parsed.data.body, latestVersion(row).number + 1);
    if ("errors" in result) return c.json(result.errors, 400);
    row.versions.push(result.version);
    row.updatedAt = nowIso();
    return c.json(blueprintVersionJson(row.id, result.version, 0), 201);
  });

  app.get("/postprocessing-blueprints/:blueprint_id/versions/:number", (c) => {
    const row = readableBlueprint(c.get("actor"), c.req.param("blueprint_id"));
    const version = row ? versionNumbered(row, Number(c.req.param("number"))) : undefined;
    if (!row || !version) return c.json({ detail: "Blueprint version not found" }, 404);
    return c.json(blueprintVersionJson(row.id, version, blueprintDeviceCount(row.id, version.number)));
  });

  // --- Device postprocessings: a blueprint version wired to one device ---

  function versionOf(row: PostprocessingRow): { blueprint: BlueprintRow; version: BlueprintVersionRow } | null {
    const blueprint = db.blueprints.find((candidate) => candidate.id === row.blueprintId);
    const version = blueprint ? versionNumbered(blueprint, row.versionNumber) : undefined;
    return blueprint && version ? { blueprint, version } : null;
  }

  async function problemsOf(row: PostprocessingRow, device: Device): Promise<string[]> {
    const resolved = versionOf(row);
    if (!resolved) return [];
    const channels = await deviceChannels(db, device);
    return problems(
      row,
      resolved.version,
      db.calibrations.filter((calibration) => calibration.postprocessingId === row.id),
      (measurementId) => {
        const channel = channels.find((candidate) => candidate.id === measurementId);
        const producer = channel?.producedBy ? db.postprocessings.find((other) => other.id === channel.producedBy) : undefined;
        return channel && producer ? { channel: channel.type.channel, isEnabled: producer.isEnabled } : null;
      },
    );
  }

  async function postprocessingBody(row: PostprocessingRow, device: Device) {
    const resolved = versionOf(row);
    if (!resolved) throw new Error(`Postprocessing ${row.id} lost its blueprint version`);
    const types = await db.measurements.list();
    return postprocessingJson(
      row,
      resolved.blueprint,
      toleranceFor(row, device.readingIntervalSeconds),
      (output) => types.find((type) => type.id === output.measurementTypeId)?.channel ?? `derived.${output.fieldName}`,
      await problemsOf(row, device),
    );
  }

  /** The device, when the caller may change its postprocessings. */
  async function deviceForWrite(actor: Actor, deviceUuid: string) {
    const device = await deviceForRead(db, actor, deviceUuid);
    if (!device) return { error: 404 as const };
    const mesh = await db.meshes.get(device.meshId);
    if (!mesh || !canWriteMesh(actor, mesh)) return { error: 403 as const };
    return { device, mesh };
  }

  function attachedTo(device: Device, postprocessingId: string): PostprocessingRow | undefined {
    return db.postprocessings.find((row) => row.id === postprocessingId && row.deviceUuid === device.uuid);
  }

  /**
   * Apply `{slot: measurement id | null}` over the current bindings. Slots the version no longer
   * declares are dropped, and a slot left unbound takes the channel its `default_channel` names.
   */
  async function rebind(row: PostprocessingRow, device: Device, version: BlueprintVersionRow, requested: Record<string, string | null>) {
    const slots = version.inputs.map((entry) => entry.slot);
    const unknown = Object.keys(requested).filter((slot) => !slots.includes(slot));
    if (unknown.length) return [`No input slot(s) ${unknown.join(", ")} in this blueprint version`];
    const channels = await deviceChannels(db, device);
    const bindings: Record<string, string> = {};
    for (const entry of version.inputs) {
      const asked = entry.slot in requested ? requested[entry.slot] : row.bindings[entry.slot];
      if (asked) {
        const channel = channels.find((candidate) => candidate.id === asked);
        if (!channel) return [`Measurement ${asked} is not a channel of this device`];
        if (channel.producedBy === row.id) return ["These bindings would make this postprocessing depend on its own output"];
        bindings[entry.slot] = asked;
      } else if (!(entry.slot in requested) && entry.default_channel) {
        const channel = channels.find((candidate) => candidate.type.channel === entry.default_channel && candidate.producedBy !== row.id);
        if (channel) bindings[entry.slot] = channel.id;
      }
    }
    row.bindings = bindings;
    return [];
  }

  /** Create or drop the derived channels so they match what the version writes under the prefix. */
  async function syncOutputs(row: PostprocessingRow, device: Device, version: BlueprintVersionRow): Promise<string[]> {
    const fields = outputFieldNames(version, row.outputPrefix);
    const taken = db.postprocessings
      .filter((other) => other.deviceUuid === device.uuid && other.id !== row.id)
      .flatMap((other) => other.outputs.map((output) => output.fieldName));
    const clash = fields.filter((field) => taken.includes(field));
    if (clash.length) {
      return [`Derived channel(s) ${clash.map((f) => `derived.${f}`).join(", ")} already exist on this device. Set an output_prefix`];
    }
    const dropped = row.outputs.filter((output) => !fields.includes(output.fieldName));
    const readers = db.postprocessings.filter(
      (other) => other.id !== row.id && Object.values(other.bindings).some((id) => dropped.some((output) => output.measurementId === id)),
    );
    if (readers.length) return ["Another postprocessing on this device reads a channel this change would remove"];
    const channels = await deviceChannels(db, device);
    const now = nowIso();
    row.outputs = fields.map((field) => {
      const kept = row.outputs.find((output) => output.fieldName === field);
      if (kept) return kept;
      const step = version.steps.find((candidate) => Object.values(candidate.outputs).some((name) => `${row.outputPrefix}${name}` === field));
      const output = step ? Object.entries(step.outputs).find(([, name]) => `${row.outputPrefix}${name}` === field)?.[0] : undefined;
      const declared = step && output ? ALGORITHMS.find((a) => a.name === step.function_name)?.output_units[output] : undefined;
      // "@<input>" preserves the unit of whatever channel feeds that input.
      const ref = declared?.startsWith("@") && step ? step.inputs[declared.slice(1)] : undefined;
      const boundId = ref?.startsWith("slot:") ? row.bindings[ref.slice(5)] : undefined;
      const unit = declared?.startsWith("@") ? (channels.find((c) => c.id === boundId)?.type.nativeUnit ?? null) : (declared ?? null);
      const type = db.measurements.ensure(
        {
          payloadKind: "computed:derived",
          fieldName: field,
          channel: `derived.${field}`,
          origin: "computed",
          displayName: null,
          description: null,
          nativeUnit: unit,
          quantityKind: null,
          vocabularyUri: null,
        },
        now,
        newId(),
      );
      return { fieldName: field, measurementId: newId(), measurementTypeId: type.id, unit: type.nativeUnit };
    });
    return [];
  }

  function countAttached(device: Device) {
    device.postprocessingCount = db.postprocessings.filter((row) => row.deviceUuid === device.uuid).length;
  }

  app.get("/devices/:device_uuid/postprocessings", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const rows = db.postprocessings.filter((row) => row.deviceUuid === device.uuid);
    return c.json(await Promise.all(rows.map((row) => postprocessingBody(row, device))));
  });

  app.post("/devices/:device_uuid/postprocessings", async (c) => {
    const actor = c.get("actor");
    const found = await deviceForWrite(actor, c.req.param("device_uuid"));
    if ("error" in found) return c.json(found.error === 404 ? { detail: "Not found" } : NO_PERMISSION, found.error);
    const { device, mesh } = found;
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zDevicesPostprocessingsCreateData.safeParse({ path: { device_uuid: device.uuid }, body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const data = parsed.data.body ?? {};
    if (!data.blueprint_id) return c.json({ blueprint_id: ["This field is required."] }, 400);
    if (data.output_prefix !== undefined && !PREFIX_PATTERN.test(data.output_prefix)) {
      return c.json({ output_prefix: ["Use lowercase letters, digits and underscores"] }, 400);
    }
    const blueprint = readableBlueprint(actor, data.blueprint_id);
    if (!blueprint) return c.json({ detail: "Not found" }, 404);
    if (!canAttachBlueprint(actor, blueprint, mesh.ownerId)) {
      return c.json({ detail: "This blueprint is neither public nor owned by the device's mesh owner" }, 403);
    }
    const version = data.blueprint_version ? versionNumbered(blueprint, data.blueprint_version) : latestVersion(blueprint);
    if (!version) return c.json({ blueprint_version: ["No such version of this blueprint"] }, 400);
    const now = nowIso();
    const row: PostprocessingRow = {
      id: newId(),
      deviceUuid: device.uuid,
      blueprintId: blueprint.id,
      versionNumber: version.number,
      bindings: {},
      outputPrefix: data.output_prefix ?? "",
      toleranceSeconds: data.tolerance_seconds ?? null,
      isEnabled: false,
      outputs: [],
      createdAt: now,
      updatedAt: now,
    };
    const errors = [...(await rebind(row, device, version, data.input_bindings ?? {})), ...(await syncOutputs(row, device, version))];
    if (errors.length) return c.json(errors, 400);
    db.postprocessings.push(row);
    if (data.is_enabled) {
      const found = await problemsOf(row, device);
      if (found.length) {
        db.postprocessings = db.postprocessings.filter((candidate) => candidate.id !== row.id);
        return c.json({ is_enabled: found }, 400);
      }
      row.isEnabled = true;
    }
    countAttached(device);
    return c.json(await postprocessingBody(row, device), 201);
  });

  app.get("/devices/:device_uuid/postprocessings/:postprocessing_id", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    const row = device ? attachedTo(device, c.req.param("postprocessing_id")) : undefined;
    if (!device || !row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    return c.json(await postprocessingBody(row, device));
  });

  app.put("/devices/:device_uuid/postprocessings/:postprocessing_id", async (c) => {
    const found = await deviceForWrite(c.get("actor"), c.req.param("device_uuid"));
    if ("error" in found) return c.json(found.error === 404 ? { detail: "Not found" } : NO_PERMISSION, found.error);
    const { device } = found;
    const row = attachedTo(device, c.req.param("postprocessing_id"));
    const resolved = row ? versionOf(row) : null;
    if (!row || !resolved) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zDevicesPostprocessingsUpdateData.safeParse({ path: { device_uuid: device.uuid, postprocessing_id: row.id }, body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const data = parsed.data.body ?? {};
    if (data.blueprint_id && data.blueprint_id !== row.blueprintId) {
      return c.json({ blueprint_id: ["Detach this postprocessing and attach the other blueprint instead"] }, 400);
    }
    if (data.output_prefix !== undefined && !PREFIX_PATTERN.test(data.output_prefix)) {
      return c.json({ output_prefix: ["Use lowercase letters, digits and underscores"] }, 400);
    }
    // Work on a copy so a refused change leaves the row as it was.
    const next: PostprocessingRow = { ...row, bindings: { ...row.bindings }, outputs: [...row.outputs] };
    let version = resolved.version;
    let rewired = data.input_bindings !== undefined || data.output_prefix !== undefined;
    if (data.blueprint_version !== undefined && data.blueprint_version !== row.versionNumber) {
      const moved = versionNumbered(resolved.blueprint, data.blueprint_version);
      if (!moved) return c.json({ blueprint_version: ["No such version of this blueprint"] }, 400);
      version = moved;
      next.versionNumber = moved.number;
      rewired = true;
    }
    if (data.output_prefix !== undefined) next.outputPrefix = data.output_prefix;
    if (data.tolerance_seconds !== undefined) next.toleranceSeconds = data.tolerance_seconds;
    if (rewired) {
      const errors = [...(await rebind(next, device, version, data.input_bindings ?? {})), ...(await syncOutputs(next, device, version))];
      if (errors.length) return c.json(errors, 400);
    }
    next.isEnabled = data.is_enabled ?? row.isEnabled;
    if (next.isEnabled) {
      const found = await problemsOf(next, device);
      if (found.length) return c.json({ is_enabled: found }, 400);
    }
    next.updatedAt = nowIso();
    Object.assign(row, next);
    return c.json(await postprocessingBody(row, device));
  });

  app.delete("/devices/:device_uuid/postprocessings/:postprocessing_id", async (c) => {
    const found = await deviceForWrite(c.get("actor"), c.req.param("device_uuid"));
    if ("error" in found) return c.json(found.error === 404 ? { detail: "Not found" } : NO_PERMISSION, found.error);
    const { device } = found;
    const row = attachedTo(device, c.req.param("postprocessing_id"));
    if (!row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const outputIds = new Set(row.outputs.map((output) => output.measurementId));
    if (db.postprocessings.some((other) => other.id !== row.id && Object.values(other.bindings).some((id) => outputIds.has(id)))) {
      return c.json(["Another postprocessing on this device reads a channel this change would remove"], 409);
    }
    db.postprocessings = db.postprocessings.filter((candidate) => candidate.id !== row.id);
    db.calibrations = db.calibrations.filter((calibration) => calibration.postprocessingId !== row.id);
    db.backfills = db.backfills.filter((backfill) => backfill.postprocessingId !== row.id);
    countAttached(device);
    return c.body(null, 204);
  });

  app.get("/devices/:device_uuid/postprocessings/:postprocessing_id/calibrations", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    const row = device ? attachedTo(device, c.req.param("postprocessing_id")) : undefined;
    if (!device || !row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const history = db.calibrations
      .filter((calibration) => calibration.postprocessingId === row.id)
      .sort((a, b) => a.stepKey.localeCompare(b.stepKey) || a.validFrom.localeCompare(b.validFrom));
    return c.json(history.map(calibrationJson));
  });

  app.post("/devices/:device_uuid/postprocessings/:postprocessing_id/calibrations", async (c) => {
    const found = await deviceForWrite(c.get("actor"), c.req.param("device_uuid"));
    if ("error" in found) return c.json(found.error === 404 ? { detail: "Not found" } : NO_PERMISSION, found.error);
    const row = attachedTo(found.device, c.req.param("postprocessing_id"));
    const resolved = row ? versionOf(row) : null;
    if (!row || !resolved) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zDevicesPostprocessingsCalibrationsCreateData.safeParse({
      path: { device_uuid: found.device.uuid, postprocessing_id: row.id },
      body,
    });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const { step_key: stepKey, valid_from: validFrom } = parsed.data.body;
    const step = resolved.version.steps.find((candidate) => candidate.key === stepKey);
    if (!step) {
      const keys = resolved.version.steps.map((candidate) => `'${candidate.key}'`).join(", ");
      return c.json({ step_key: [`No step '${stepKey}', expected one of [${keys}]`] }, 400);
    }
    const params = plainRecord(parsed.data.body.params);
    if (!params) return c.json({ params: ["Must be an object"] }, 400);
    const errors = validateCalibration(step.function_name, params);
    if (errors.length) return c.json({ params: errors }, 400);
    const now = nowIso();
    const calibration = {
      id: newId(),
      postprocessingId: row.id,
      stepKey,
      functionName: step.function_name,
      params,
      validFrom: validFrom ?? now,
      createdAt: now,
    };
    db.calibrations.push(calibration);
    return c.json(calibrationJson(calibration), 201);
  });

  app.delete("/devices/:device_uuid/postprocessings/:postprocessing_id/calibrations/:calibration_id", async (c) => {
    const found = await deviceForWrite(c.get("actor"), c.req.param("device_uuid"));
    if ("error" in found) return c.json(found.error === 404 ? { detail: "Not found" } : NO_PERMISSION, found.error);
    const row = attachedTo(found.device, c.req.param("postprocessing_id"));
    const calibration = db.calibrations.find(
      (candidate) => candidate.id === c.req.param("calibration_id") && candidate.postprocessingId === row?.id,
    );
    if (!row || !calibration) return c.json({ detail: "Not found" }, 404);
    db.calibrations = db.calibrations.filter((candidate) => candidate.id !== calibration.id);
    if (row.isEnabled && (await problemsOf(row, found.device)).length) {
      db.calibrations.push(calibration);
      return c.json({ detail: "This would leave an enabled postprocessing uncalibrated. Disable it first" }, 409);
    }
    return c.body(null, 204);
  });

  app.get("/devices/:device_uuid/postprocessings/:postprocessing_id/backfills", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    const row = device ? attachedTo(device, c.req.param("postprocessing_id")) : undefined;
    if (!device || !row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const rows = db.backfills.filter((backfill) => backfill.postprocessingId === row.id);
    return c.json([...rows].reverse().map(backfillJson));
  });

  app.post("/devices/:device_uuid/postprocessings/:postprocessing_id/backfills", async (c) => {
    const found = await deviceForWrite(c.get("actor"), c.req.param("device_uuid"));
    if ("error" in found) return c.json(found.error === 404 ? { detail: "Not found" } : NO_PERMISSION, found.error);
    const row = attachedTo(found.device, c.req.param("postprocessing_id"));
    if (!row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zDevicesPostprocessingsBackfillsCreateData.safeParse({
      path: { device_uuid: found.device.uuid, postprocessing_id: row.id },
      body,
    });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const now = nowIso();
    const stop = parsed.data.body.stop ?? now;
    const start = parsed.data.body.start;
    if (Date.parse(start) >= Date.parse(stop)) return c.json({ start: ["Must be before stop"] }, 400);
    if (Date.parse(stop) - Date.parse(start) > MAX_BACKFILL_DAYS * 86_400_000) {
      return c.json({ start: [`A backfill covers at most ${MAX_BACKFILL_DAYS} days. Split it`] }, 400);
    }
    const blockers = await problemsOf(row, found.device);
    if (blockers.length) return c.json(blockers, 400);
    const backfill = {
      id: newId(),
      postprocessingId: row.id,
      start,
      stop,
      includeDependants: parsed.data.body.include_dependants ?? false,
      status: "pending" as const,
      pointsPublished: 0,
      error: null,
      createdAt: now,
      startedAt: null,
      finishedAt: null,
    };
    db.backfills.push(backfill);
    return c.json(backfillJson(backfill), 202);
  });

  app.get("/telemetry-variants/:telemetry_variant_id/measurements", async (c) => {
    if (c.req.param("telemetry_variant_id") !== VARIANT_ENV_ID) return c.json([]);
    const types = await db.measurements.list();
    const temp = types.find((t) => t.id === MEAS_TEMP_ID);
    if (!temp) return c.json([]);
    return c.json([telemetryVariantMeasurementJson(db, temp, VARIANT_LINK_ID)]);
  });

  app.get("/telemetry-variants/:telemetry_variant_id/measurements/:link_id", async (c) => {
    if (c.req.param("telemetry_variant_id") !== VARIANT_ENV_ID || c.req.param("link_id") !== VARIANT_LINK_ID) {
      return c.json({ detail: "Not found" }, 404);
    }
    const types = await db.measurements.list();
    const temp = types.find((t) => t.id === MEAS_TEMP_ID);
    if (!temp) return c.json({ detail: "Not found" }, 404);
    return c.json(telemetryVariantMeasurementJson(db, temp, VARIANT_LINK_ID));
  });

  app.put("/telemetry-variants/:telemetry_variant_id/measurements/:link_id", async (c) => {
    const actor = c.get("actor");
    if (actor.role !== "superuser") {
      return c.json({ detail: "You do not have permission to perform this action." }, 403);
    }
    if (c.req.param("telemetry_variant_id") !== VARIANT_ENV_ID || c.req.param("link_id") !== VARIANT_LINK_ID) {
      return c.json({ detail: "Not found" }, 404);
    }
    const types = await db.measurements.list();
    const temp = types.find((t) => t.id === MEAS_TEMP_ID);
    if (!temp) return c.json({ detail: "Not found" }, 404);
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zTelemetryVariantsMeasurementsUpdateData.safeParse({
      path: { telemetry_variant_id: c.req.param("telemetry_variant_id"), link_id: c.req.param("link_id") },
      body,
    });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const patch = parsed.data.body ?? {};
    if (patch.default_enabled_detectors) {
      const unknownNames = patch.default_enabled_detectors.filter((name) => !MEASUREMENT_DETECTORS.includes(name));
      if (unknownNames.length) {
        return c.json(
          {
            detail: `Unknown detector(s) ${unknownNames.join(", ")}. Valid: ${MEASUREMENT_DETECTORS.join(", ")}`,
          },
          400,
        );
      }
    }
    const current = db.telemetryVariantMeasurements.get(VARIANT_LINK_ID) ?? { defaultEnabledDetectors: [] };
    db.telemetryVariantMeasurements.set(VARIANT_LINK_ID, {
      defaultEnabledDetectors: patch.default_enabled_detectors ?? current.defaultEnabledDetectors,
    });
    return c.json(telemetryVariantMeasurementJson(db, temp, VARIANT_LINK_ID));
  });

  /**
   * Superusers, or the mesh's owner while an operator; everyone else is told the mesh
   * doesn't exist. Null where the caller may read the archive.
   */
  async function archiveRefusal(actor: Actor, meshId: string, credentials = false) {
    if (!(credentials ? ARCHIVE_ISSUES_CREDENTIALS : ARCHIVE_ENABLED)) return { detail: "Not found" };
    const mesh = await db.meshes.get(meshId);
    if (!mesh || !canReadArchive(actor, mesh)) return { detail: "Mesh not found" };
    return null;
  }

  app.get("/readings/archive/meshes/:mesh_id", async (c) => {
    const meshId = c.req.param("mesh_id");
    const refusal = await archiveRefusal(c.get("actor"), meshId);
    if (refusal) return c.json(refusal, 404);
    const [start, stop] = [c.req.query("start"), c.req.query("stop")];
    for (const [name, value] of [["start", start], ["stop", stop]] as const) {
      if (value && !DAY_PATTERN.test(value)) return c.json({ [name]: ["Expected a date as YYYY-MM-DD."] }, 400);
    }
    return c.json({ mesh_id: meshId, prefix: meshPrefix(meshId), partitions: db.archive.partitions(meshId, start, stop) });
  });

  app.post("/readings/archive/meshes/:mesh_id/credentials", async (c) => {
    const actor = c.get("actor");
    const meshId = c.req.param("mesh_id");
    const refusal = await archiveRefusal(actor, meshId, true);
    if (refusal) return c.json(refusal, 404);
    const token = () => newId().replaceAll("-", "");
    console.info(`[mock] archive credentials issued to ${actor.email} for mesh ${meshId}`);
    return c.json(
      {
        access_key_id: `MOCK${token().slice(0, 16).toUpperCase()}`,
        secret_access_key: token() + token().slice(0, 8),
        session_token: token() + token() + token(),
        expires_at: new Date(Date.now() + ARCHIVE_CREDENTIAL_TTL_S * 1000).toISOString(),
        endpoint: ARCHIVE_PUBLIC_ENDPOINT,
        region: ARCHIVE_REGION,
        bucket: ARCHIVE_BUCKET,
        prefix: meshPrefix(meshId),
        s3_path: `s3://${ARCHIVE_BUCKET}/${meshPrefix(meshId)}`,
      },
      201,
    );
  });

  app.get("/readings/archive/meshes/:mesh_id/partitions/:day/:hour", async (c) => {
    const meshId = c.req.param("mesh_id");
    const refusal = await archiveRefusal(c.get("actor"), meshId);
    if (refusal) return c.json(refusal, 404);
    const day = c.req.param("day");
    const hour = Number(c.req.param("hour"));
    const found = db.archive.partitions(meshId, day, day).some((p) => p.hour === hour);
    if (!DAY_PATTERN.test(day) || !found) return c.json({ detail: "Partition not found" }, 404);
    const url = new URL(`${MOCK_S3_PATH}${ARCHIVE_BUCKET}/${partitionKey(meshId, day, hour)}`, c.req.url);
    url.searchParams.set("X-Amz-Expires", String(ARCHIVE_CREDENTIAL_TTL_S));
    url.searchParams.set("X-Amz-Signature", "mock");
    return c.redirect(url.toString(), 302);
  });

  app.get("/readings/archive/meshes/:mesh_id/zip", async (c) => {
    const meshId = c.req.param("mesh_id");
    const refusal = await archiveRefusal(c.get("actor"), meshId);
    if (refusal) return c.json(refusal, 404);
    const [start, stop] = [c.req.query("start"), c.req.query("stop")];
    for (const [name, value] of [["start", start], ["stop", stop]] as const) {
      if (value && !DAY_PATTERN.test(value)) return c.json({ [name]: ["Expected a date as YYYY-MM-DD."] }, 400);
    }
    const partitions = db.archive.partitions(meshId, start, stop);
    if (!partitions.length) return c.json({ detail: "Nothing archived in that range" }, 404);
    const first = partitions[0]!.dt;
    const last = partitions.at(-1)!.dt;
    const hour = (h: number) => String(h).padStart(2, "0");
    const zip = storedZip(
      partitions.map((p) => ({
        name: `${p.dt}/${p.dt}_${hour(p.hour)}.parquet`,
        data: new TextEncoder().encode(`PAR1 mock ${partitionKey(meshId, p.dt, p.hour)} PAR1`),
        modified: new Date(p.last_modified),
      })),
    );
    return c.body(zip, 200, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="mesh-${meshId.slice(0, 8)}_${first === last ? first : `${first}_${last}`}.zip"`,
    });
  });

  // The object a presigned link names. Not real Parquet: the mock stores no rows.
  app.get(`${MOCK_S3_PATH}*`, (c) =>
    c.body("PAR1 mock archive object: the console mock stores no readings. PAR1", 200, {
      "Content-Type": "application/vnd.apache.parquet",
      "Content-Disposition": 'attachment; filename="data.parquet"',
    }),
  );

  app.get("/readings/devices/:device_uuid/latest", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const readings = await db.readings.latest(device.uuid);
    return c.json(latestJson(device, readings));
  });

  app.get("/readings/devices/:device_uuid/quality", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const start = c.req.query("start") ?? "-24h";
    const stop = c.req.query("stop") ?? "now()";
    if (device.uuid !== DEVICE_NODE_ID && device.uuid !== DEVICE_GW_ID) {
      return c.json({
        mesh_id: device.meshId,
        node_id: device.nodeId,
        start,
        stop,
        points_ingested: 0,
        range_ratio: null,
        alarms_by_detector: {},
        channels: [],
      });
    }
    return c.json({
      mesh_id: device.meshId,
      node_id: device.nodeId,
      start,
      stop,
      points_ingested: 190,
      range_ratio: 0.97,
      alarms_by_detector: { completeness: 1, range: 0, flat_value: 0, absence: 0 },
      channels: [
        {
          channel: "environmentmetrics.temperature",
          completeness_ratio: 0.91,
          observed: 190,
          expected: 208,
          largest_gap_seconds: 1200,
        },
      ],
    });
  });

  app.get("/readings/devices/:device_uuid", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const series = await db.readings.series(device.uuid, {
      channel: c.req.query("channel"),
      payloadKind: c.req.query("payload_kind"),
      start: c.req.query("start"),
      stop: c.req.query("stop"),
      window: c.req.query("window"),
      agg: c.req.query("agg"),
    });
    return c.json({
      mesh_id: device.meshId,
      node_id: device.nodeId,
      payload_kind: series.payloadKind,
      series: series.series,
    });
  });

  app.notFound((c) => c.json({ detail: "Not implemented" }, 501));
  return app;
}

function telemetryVariantJson(variant: (typeof TELEMETRY_VARIANTS)[number], at: string) {
  return {
    id: variant.id,
    payload_kind: variant.payloadKind,
    name: variant.name,
    description: null,
    default_reading_interval_seconds: variant.defaultReadingIntervalSeconds,
    created_at: at,
    updated_at: at,
  };
}
