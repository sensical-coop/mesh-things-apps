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
  zPostprocessingBlueprintsCreateData,
  zOperatorRequestsUpdateData,
  zOwnersMeOperatorRequestCreateData,
  zOwnersMeTermsAcceptanceCreateData,
  zSourcesTermsAcceptanceCreateData,
  zSourcesCreateData,
  zSourcesUpdateData,
  zTelemetryVariantsMeasurementsUpdateData,
} from "@mtt/contracts/zod";
import { matchesDeviceFilter, type Device } from "@mtt/domain/device/Device";
import type { MeasurementType } from "@mtt/domain/measurement/Measurement";
import type { Mesh } from "@mtt/domain/mesh/Mesh";
import {
  canDecideOperatorRequests,
  canManageSources,
  canRequestOperator,
  canSeeDataDeletions,
  canSeeMeshSource,
  canReadMesh,
  canReadOwnerEmail,
  canSeePsk,
  canWriteMesh,
  visibleOwned,
  visibleSources,
  type Actor,
} from "@mtt/domain/authz/authz";
import { validateSource, type Source } from "@mtt/domain/source/Source";
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
import { newId, nowIso } from "@mtt/domain/shared/ids";
import { NIL_BLUEPRINT_ID } from "@mtt/domain/shared/blueprint";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import {
  DETECTOR_CATALOG,
  DEVICE_MEAS_ID,
  DEVICE_NODE_ID,
  DEVICE_GW_ID,
  DEVICE_VARIANT_ID,
  MEASUREMENT_DETECTORS,
  MEAS_TEMP_ID,
  VARIANT_ENV_ID,
  VARIANT_LINK_ID,
  type Store,
} from "./store";
import { createMockAuth, seedStore, setOwnerPassword, stampLogin, type MockAuth } from "./auth";
import {
  blueprintJson,
  deviceJson,
  latestJson,
  measurementJson,
  meshJson,
  ownerProfileJson,
  ownerPublicJson,
  ownerReadJson,
  ownerWithApiKeyJson,
  operatorRequestAdminJson,
  operatorRequestJson,
  dataDeletionJson,
  sourceReadJson,
} from "./serialize";

type Env = { Variables: { actor: Actor } };

const RESEND_COOLDOWN_SECONDS = 60; // keep in sync with apps/web resend-cooldown.ts
const PASSWORD_RESET_TTL_HOURS = 1; // keep in sync with meshtastic-things REGISTRY__PASSWORD_RESET_TTL_HOURS
const INACTIVE_ALLOWED_PATHS = new Set(["/owners/me", "/owners/me/resend-verification"]);
const NO_VERIFICATION = { emailVerifiedAt: null, emailVerificationSentAt: null };

const ALGORITHMS = [
  {
    name: "dew_point",
    inputs: ["temperature", "relative_humidity"],
    outputs: ["dew_point"],
    params: [],
    optional_params: [],
    mode: "pointwise",
    doc: "Dew point from temperature and RH.",
    output_units: { dew_point: "degC" },
  },
  {
    name: "absolute_humidity",
    inputs: ["temperature", "relative_humidity"],
    outputs: ["absolute_humidity"],
    params: [],
    optional_params: [],
    mode: "pointwise",
    doc: "Absolute humidity in g/m3.",
    output_units: { absolute_humidity: "g/m3" },
  },
];

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
    (method === "GET" && path === "/terms")
  );
}

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

function deviceMeasurementId(index: number): string {
  return index === 0 ? DEVICE_MEAS_ID : `${DEVICE_MEAS_ID.slice(0, -1)}${index}`;
}

// Only the fixtured temperature channel is linked into a telemetry-variant
// catalog entry (VARIANT_LINK_ID) in this mock; every other channel has no
// configured catalog default, so it effectively inherits an empty list.
function catalogDefaultDetectors(store: Store, measurementTypeId: string): string[] {
  if (measurementTypeId !== MEAS_TEMP_ID) return [];
  return store.telemetryVariantMeasurements.get(VARIANT_LINK_ID)?.defaultEnabledDetectors ?? [];
}

function deviceMeasurementJson(store: Store, device: Device, type: MeasurementType, index: number) {
  const id = deviceMeasurementId(index);
  const enabledDetectors = store.detectorOverrides.get(id) ?? null;
  const effectiveDetectors = [...(enabledDetectors ?? catalogDefaultDetectors(store, type.id))].sort();
  const range = store.deviceMeasurementRanges.get(id) ?? { validMin: null, validMax: null };
  return {
    id,
    telemetry_variant_id: type.origin === "measured" ? VARIANT_ENV_ID : NIL_BLUEPRINT_ID,
    measurement_type: measurementJson(type),
    enabled_detectors: enabledDetectors,
    effective_detectors: effectiveDetectors,
    valid_min: range.validMin,
    valid_max: range.validMax,
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

async function findDeviceMeasurement(
  store: Store,
  device: Device,
  measurementId: string,
): Promise<{ type: MeasurementType; index: number } | null> {
  if (device.uuid !== DEVICE_NODE_ID) return null;
  const types = await store.measurements.list();
  const index = types.findIndex((_, i) => deviceMeasurementId(i) === measurementId);
  if (index === -1) return null;
  return { type: types[index]!, index };
}

export async function createApp(store?: Store, auth: MockAuth = createMockAuth()) {
  const db = store ?? (await seedStore(auth));

  /** A source the caller may see, or the mesh's current one, which resending always keeps. */
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
  const TERMS_ROUTE = /^\/(terms|meshes\/terms|sources\/terms|owners\/me\/terms-acceptance|(meshes|sources)\/[^/]+\/terms-acceptance)$/;
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
      applySetCookie(c, result.headers);
      const actor = db.actors.get(result.response.user.id);
      if (!actor?.isActive) return c.json({ detail: "Invalid credentials" }, 400);
      stampLogin(actor);
      const verification = db.verifications.get(actor.id) ?? NO_VERIFICATION;
      return c.json(ownerProfileJson(actor, await devicesFor(db, actor), verification, ownerTerms(actor.id)));
    } catch {
      return c.json({ detail: "Invalid credentials" }, 400);
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
    const authHeader = c.req.header("Authorization") ?? "";
    const [scheme, token] = authHeader.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      return c.json({ detail: "Authentication credentials were not provided." }, 401);
    }
    const entry = db.passwordResetTokens.get(token);
    const expired =
      !entry || Date.now() > Date.parse(entry.sentAt) + PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000;
    if (expired) {
      return c.json(
        { detail: "Invalid or expired reset link - request a new one via POST /owners/request-password-reset" },
        401,
      );
    }
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zOwnersResetPasswordCreateData.safeParse({ body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    await setOwnerPassword(auth, entry.ownerId, parsed.data.body.new_password);
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
      lastLogin: null,
      alarmEmailCooldownSeconds: null,
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
    return c.json(ownerProfileJson(actor, await devicesFor(db, actor), verification, ownerTerms(actor.id)));
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
      for (const device of devices) await db.devices.delete(device.uuid);
      await db.meshes.delete(mesh.id);
    }
    db.blueprints = db.blueprints.filter((blueprint) => blueprint.ownerId !== actor.id);
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
    const devices = await db.devices.list({ meshId: mesh.id });
    return c.json(devices.filter((device) => visibleToReader(actor, mesh, device)).map(deviceJson));
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
    for (const device of devices) await db.devices.delete(device.uuid);
    await db.meshes.delete(mesh.id);
    scheduleMeshDeletion(mesh.id, "mesh_deleted", { sourceId: mesh.sourceId, requestedById: actor.id });
    return c.body(null, 204);
  });

  app.get("/devices", async (c) => {
    const actor = c.get("actor");
    const devices = (await devicesFor(db, actor)).filter((device) =>
      matchesDeviceFilter(device, {
        extra: queryFilters(c, ["mesh_id", "is_gateway", "is_allowed", "has_postprocessing", "label"]),
      }),
    );
    return c.json(devices.map(deviceJson));
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
    return c.json(deviceJson(device), 201);
  });

  app.get("/devices/:device_uuid", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    return c.json(deviceJson(device));
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
    const lat = patch.latitude;
    const lon = patch.longitude;
    const device = await db.devices.update(c.req.param("device_uuid"), {
      label: patch.label,
      name: patch.name,
      shortName: patch.short_name,
      latitude: lat,
      longitude: lon,
      isAllowed: patch.is_allowed,
      isGateway: patch.is_gateway,
      absenceDetectionEnabled: patch.absence_detection_enabled,
      postprocessingBlueprintId: patch.postprocessing_blueprint_id,
      readingIntervalSeconds: patch.reading_interval_seconds,
      publishIntervalSeconds: patch.publish_interval_seconds,
      locationOverridden: lat != null && lon != null ? true : undefined,
    });
    if (!device) return c.json({ detail: "Not found" }, 404);
    return c.json(deviceJson(device));
  });

  app.get("/devices/:device_uuid/measurements", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const types = await db.measurements.list();
    if (device.uuid !== DEVICE_NODE_ID) return c.json([]);
    return c.json(types.map((type, i) => deviceMeasurementJson(db, device, type, i)));
  });

  app.get("/devices/:device_uuid/measurements/:measurement_id", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const found = await findDeviceMeasurement(db, device, c.req.param("measurement_id"));
    if (!found) return c.json({ detail: "Not found" }, 404);
    return c.json(deviceMeasurementJson(db, device, found.type, found.index));
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
    return c.json(deviceMeasurementJson(db, device, found.type, found.index));
  });

  app.get("/detectors", (c) => c.json(DETECTOR_CATALOG));

  app.get("/devices/:device_uuid/telemetry-variants", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    if (device.uuid !== DEVICE_NODE_ID) return c.json([]);
    return c.json([
      {
        id: DEVICE_VARIANT_ID,
        telemetry_variant: {
          id: VARIANT_ENV_ID,
          payload_kind: "environmentmetrics",
          name: "Environment",
          description: null,
          default_reading_interval_seconds: 300,
          created_at: device.createdAt,
          updated_at: device.updatedAt,
        },
        first_seen: device.createdAt,
        last_seen: device.lastSeen,
      },
    ]);
  });

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
    if (approve && requester?.role === "owner") requester.role = "operator";
    console.info(`[mock] operator request ${row.status} for ${requester?.email ?? row.ownerId}`);
    return c.json(operatorRequestAdminJson(row, requester));
  });

  app.get("/postprocessing-blueprints", (c) => {
    const actor = c.get("actor");
    const rows = visibleOwned(actor, db.blueprints);
    return c.json(rows.map(blueprintJson));
  });

  app.post("/postprocessing-blueprints", async (c) => {
    const actor = c.get("actor");
    if (actor.role === "staff") {
      return c.json({ detail: "You do not have permission to perform this action." }, 403);
    }
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zPostprocessingBlueprintsCreateData.safeParse({ body });
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const now = nowIso();
    const row = {
      id: newId(),
      name: parsed.data.body.name,
      description: parsed.data.body.description ?? null,
      ownerId: actor.id,
      steps: parsed.data.body.steps.map((step) => ({
        id: newId(),
        order: step.order,
        function_name: step.function_name,
        inputs: step.inputs ?? {},
        params: step.params ?? {},
        outputs: step.outputs ?? {},
      })),
      createdAt: now,
      updatedAt: now,
    };
    db.blueprints.push(row);
    return c.json(blueprintJson(row), 201);
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
