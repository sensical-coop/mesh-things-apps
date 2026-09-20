import {
  zDevicesCreateData,
  zDevicesUpdateData,
  zMeshesCreateData,
  zMeshesUpdateData,
  zOwnersCreateData,
  zOwnersLoginCreateData,
  zPostprocessingBlueprintsCreateData,
} from "@mtt/contracts/zod";
import { matchesDeviceFilter } from "@mtt/domain/device/Device";
import {
  canReadMesh,
  canReadOwnerEmail,
  canSeePsk,
  canWriteMesh,
  visibleOwned,
  type Actor,
} from "@mtt/domain/authz/authz";
import { parseListFilters } from "@mtt/domain/shared/list-filter";
import { newId, nowIso } from "@mtt/domain/shared/ids";
import { NIL_BLUEPRINT_ID } from "@mtt/domain/shared/blueprint";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import {
  DEVICE_MEAS_ID,
  DEVICE_NODE_ID,
  DEVICE_GW_ID,
  DEVICE_VARIANT_ID,
  MEAS_TEMP_ID,
  VARIANT_ENV_ID,
  VARIANT_LINK_ID,
  type Store,
} from "./store";
import { createMockAuth, seedStore, stampLogin, type MockAuth } from "./auth";
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
} from "./serialize";

type Env = { Variables: { actor: Actor } };

const RESEND_COOLDOWN_SECONDS = 60; // keep in sync with apps/web resend-cooldown.ts
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

function openPath(method: string, path: string): boolean {
  return (
    path === "/owners/login" ||
    path === "/owners/csrf-cookie" ||
    path === "/health" ||
    path.startsWith("/api/auth") ||
    (method === "POST" && path === "/owners") ||
    (method === "GET" && path === "/owners/verify-email")
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

async function devicesFor(store: Store, actor: Actor) {
  const meshes = visibleOwned(actor, await store.meshes.list());
  const allowed = new Set(meshes.map((mesh) => mesh.id));
  return (await store.devices.list()).filter((device) => allowed.has(device.meshId));
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
  if (!mesh) return null;
  return device;
}

export async function createApp(store?: Store, auth: MockAuth = createMockAuth()) {
  const db = store ?? (await seedStore(auth));
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

  app.get("/health", (c) => c.json({ status: "ok" }));
  app.get("/owners/csrf-cookie", (c) => c.json({ detail: "ok" }));

  app.post("/owners/login", async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zOwnersLoginCreateData.safeParse({ body });
    if (!parsed.success) return c.json({ detail: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
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
      return c.json(ownerProfileJson(actor, await devicesFor(db, actor), verification));
    } catch {
      return c.json({ detail: "Invalid credentials" }, 400);
    }
  });

  app.post("/owners", async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zOwnersCreateData.safeParse({ body });
    if (!parsed.success) return c.json({ detail: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    const { name, email, password } = parsed.data.body;
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
    };
    db.actors.set(actor.id, actor);
    const token = newId();
    db.verificationTokens.set(token, actor.id);
    const verification = { emailVerifiedAt: null, emailVerificationSentAt: now };
    db.verifications.set(actor.id, verification);
    console.info(`[mock] verification link for ${email}: /verify-email?token=${token}`);
    return c.json(ownerWithApiKeyJson(actor, verification, `mtt_mock_${token}`), 201);
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
    return c.json(ownerProfileJson(actor, await devicesFor(db, actor), verification));
  });

  app.get("/owners", (c) => {
    const actor = c.get("actor");
    const rows = [...db.actors.values()];
    if (actor.role === "superuser") {
      return c.json(rows.map((row) => ownerReadJson(row, db.verifications.get(row.id) ?? NO_VERIFICATION)));
    }
    return c.json(rows.map(ownerPublicJson));
  });

  app.get("/owners/:owner_id", (c) => {
    const actor = c.get("actor");
    const subject = db.actors.get(c.req.param("owner_id"));
    if (!subject) return c.json({ detail: "Not found" }, 404);
    if (canReadOwnerEmail(actor, subject)) {
      return c.json(ownerReadJson(subject, db.verifications.get(subject.id) ?? NO_VERIFICATION));
    }
    return c.json(ownerPublicJson(subject));
  });

  app.get("/meshes", async (c) => {
    const actor = c.get("actor");
    const meshes = visibleOwned(actor, await db.meshes.list(queryFilters(c, ["label", "channel_id"])));
    return c.json(meshes.map((m) => meshJson(m, canSeePsk(actor, m))));
  });

  app.post("/meshes", async (c) => {
    const actor = c.get("actor");
    if (actor.role === "staff") {
      return c.json({ detail: "You do not have permission to perform this action." }, 403);
    }
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zMeshesCreateData.safeParse({ body });
    if (!parsed.success) return c.json({ detail: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    const mesh = await db.meshes.insert({
      channelId: parsed.data.body.channel_id,
      pskB64: parsed.data.body.psk_b64,
      label: parsed.data.body.label ?? null,
      ownerId: actor.id,
    });
    return c.json(meshJson(mesh, true), 201);
  });

  app.get("/meshes/:mesh_id", async (c) => {
    const actor = c.get("actor");
    const mesh = await meshForRead(db, actor, c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Not found" }, 404);
    return c.json(meshJson(mesh, canSeePsk(actor, mesh)));
  });

  app.get("/meshes/:mesh_id/devices", async (c) => {
    const actor = c.get("actor");
    const mesh = await meshForRead(db, actor, c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Not found" }, 404);
    const devices = await db.devices.list({ meshId: mesh.id });
    return c.json(devices.map(deviceJson));
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
    if (!parsed.success) return c.json({ detail: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    const updated = await db.meshes.update(mesh.id, parsed.data.body ?? {});
    if (!updated) return c.json({ detail: "Not found" }, 404);
    return c.json(meshJson(updated, canSeePsk(actor, updated)));
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
    if (!parsed.success) return c.json({ detail: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
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
    const mesh = await db.meshes.get(existing.meshId);
    if (!mesh || !canReadMesh(actor, mesh)) return c.json({ detail: "Not found" }, 404);
    if (!canWriteMesh(actor, mesh)) {
      return c.json({ detail: "You do not have permission to perform this action." }, 403);
    }
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = zDevicesUpdateData.safeParse({
      path: { device_uuid: c.req.param("device_uuid") },
      body,
    });
    if (!parsed.success) return c.json({ detail: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
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
      alarmsEnabled: patch.alarms_enabled,
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
    return c.json(
      types.map((type, i) => ({
        id: i === 0 ? DEVICE_MEAS_ID : `${DEVICE_MEAS_ID.slice(0, -1)}${i}`,
        telemetry_variant_id: type.origin === "measured" ? VARIANT_ENV_ID : NIL_BLUEPRINT_ID,
        measurement_type: measurementJson(type),
        first_seen: device.createdAt,
        last_seen: device.lastSeen,
      })),
    );
  });

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
    if (!parsed.success) return c.json({ detail: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
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
    return c.json([
      {
        id: VARIANT_LINK_ID,
        measurement_type: measurementJson(temp),
        valid_min: -40,
        valid_max: 85,
        created_at: temp.createdAt,
        updated_at: temp.updatedAt,
      },
    ]);
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
        plausibility_ratio: null,
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
      plausibility_ratio: 0.97,
      alarms_by_detector: { completeness: 1, range_check: 0, stuck_value: 0, absence: 0 },
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
