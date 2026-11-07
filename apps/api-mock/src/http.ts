import type { Device } from "@mtt/domain/device/Device";
import type { MeasurementType } from "@mtt/domain/measurement/Measurement";
import type { Mesh } from "@mtt/domain/mesh/Mesh";
import { visibleMeshes as meshesVisibleTo, canReadMesh, canWriteMesh } from "@mtt/contracts/authz";
import type { Actor } from "./auth";
import { validateSource } from "@mtt/contracts/source";
import type { Source } from "@mtt/domain/source/Source";
import { parseListFilters } from "@mtt/contracts/list-filter";
import { NIL_UUID } from "@mtt/domain/shared/ids";
import { type Context } from "hono";
import { VARIANT_ENV_ID, type Store } from "./store";
import type { DeviceChannel } from "./features/device/channels";
import { brokerHost, measurementJson } from "./serialize";

export type Env = { Variables: { actor: Actor } };

export const NO_PERMISSION = { detail: "You do not have permission to perform this action." };
export const SUPERUSERS_ONLY = NO_PERMISSION;
export const OPERATORS_ONLY = { detail: "Only an operator may access sources" };
export const SINK_OPERATORS_ONLY = { detail: "Only an operator may access sinks" };
export const NO_SINKS = { detail: "Not found" };

/** Mirrors REGISTRY__FRONTEND_RETURN_PATHS: pages a verification link may send the owner back to. */
export const FRONTEND_RETURN_PATHS = (process.env.MOCK_FRONTEND_RETURN_PATHS ?? "/start").split(",").filter(Boolean);

/** `next` must match an allowed path exactly, as in the API, so the link can't redirect elsewhere. */
export function returnPathError(next: string | undefined): Record<string, string[]> {
  return next === undefined || FRONTEND_RETURN_PATHS.includes(next)
    ? {}
    : { next: ["This page is not an allowed return path."] };
}

export function verificationLink(token: string, next: string | undefined): string {
  return `/verify-email?${new URLSearchParams(next ? { next, token } : { token })}`;
}
export const PASSWORD_RESET_TTL_HOURS = 1; // keep in sync with meshtastic-things REGISTRY__PASSWORD_RESET_TTL_HOURS
export const INACTIVE_ALLOWED_PATHS = new Set(["/owners/me", "/owners/me/resend-verification"]);
export const NO_VERIFICATION = { emailVerifiedAt: null, emailVerificationSentAt: null };

export function queryFilters(c: { req: { query: (name: string) => string | undefined } }, fields: readonly string[]) {
  const query: Record<string, string | undefined> = {};
  for (const field of fields) query[field] = c.req.query(field);
  return parseListFilters(query);
}

type ParseIssue = { path: PropertyKey[]; message: string };
type SafeParse<T> = { success: true; data: T } | { success: false; error: { issues: ParseIssue[] } };

/** DRF answers a bad body with `{ field: [message] }`; so does the mock. */
export async function parseBody<T>(
  c: Context,
  schema: { safeParse: (data: unknown) => SafeParse<T> },
): Promise<{ data: T } | { error: Record<string, string[]> }> {
  const body: unknown = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { error: fieldErrors(parsed.error.issues) };
  return { data: parsed.data };
}

export function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    // An issue on the whole body (or a path wrapper) has no field: DRF calls that non_field_errors.
    const field = [...issue.path].reverse().find((segment) => typeof segment === "string" && segment !== "body");
    const key = typeof field === "string" ? field : "non_field_errors";
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

/** Mirrors SourceSerializer: a password needs a username, also once an edit removes it. */
export function credentialErrors(username: string | null | undefined, password: string | null | undefined): Record<string, string[]> {
  return password && !username ? { username: ["A password needs a username."] } : {};
}

// Mirrors REGISTRY__SOURCES_BLOCKED_TOPICS left blank, which blocks `#`.
export const SOURCES_BLOCKED_TOPICS = new Set(["#"]);

/** The server-side source checks, including the ones only the API can make. */
export function sourceErrors(input: Partial<Pick<Source, "server" | "topic" | "qos">>): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const [key, message] of Object.entries(validateSource(input))) errors[key] = [message];
  if (!errors.server && input.server && brokerHost(input.server).own) {
    errors.server = ["A source cannot point at this instance's own broker."];
  }
  if (!errors.topic && input.topic !== undefined && SOURCES_BLOCKED_TOPICS.has(input.topic.trim())) {
    errors.topic = ["This topic filter is not allowed as a source."];
  }
  return errors;
}

/** Stands in for EMQX: a `.invalid` host fails the bridge, as an unreachable EMQX API would. */
export function bridgeFails(source: Pick<Source, "server">): boolean {
  return brokerHost(source.server).invalid;
}

export function openPath(method: string, path: string): boolean {
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
export const MOCK_S3_PATH = "/mock-s3/";
export const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function applySetCookie(c: Context, headers: Headers) {
  const cookies = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  if (cookies.length) {
    for (const cookie of cookies) c.header("Set-Cookie", cookie, { append: true });
    return;
  }
  const single = headers.get("set-cookie");
  if (single) c.header("Set-Cookie", single, { append: true });
}

export async function visibleMeshes(store: Store, actor: Actor) {
  return meshesVisibleTo(actor, await store.meshes.list());
}

/** A rejected registration is the mesh owner's business, not a viewer's. */
export function visibleToReader(actor: Actor, mesh: Mesh, device: Device): boolean {
  return device.isAllowed || canWriteMesh(actor, mesh);
}

export async function devicesFor(store: Store, actor: Actor) {
  const meshes = new Map((await visibleMeshes(store, actor)).map((mesh) => [mesh.id, mesh]));
  return (await store.devices.list()).filter((device) => {
    const mesh = meshes.get(device.meshId);
    return mesh != null && visibleToReader(actor, mesh, device);
  });
}

export async function meshForRead(store: Store, actor: Actor, meshId: string) {
  const mesh = await store.meshes.get(meshId);
  if (!mesh || !canReadMesh(actor, mesh)) return null;
  return mesh;
}

export async function deviceForRead(store: Store, actor: Actor, uuid: string) {
  const device = await store.devices.get(uuid);
  if (!device) return null;
  const mesh = await meshForRead(store, actor, device.meshId);
  if (!mesh || !visibleToReader(actor, mesh, device)) return null;
  return device;
}

export function catalogDefaultDetectors(store: Store, measurementTypeId: string): string[] {
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

