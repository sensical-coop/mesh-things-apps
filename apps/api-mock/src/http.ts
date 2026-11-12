import type { Device } from "@mtt/domain/device/Device";
import type { Mesh } from "@mtt/domain/mesh/Mesh";
import { visibleMeshes as meshesVisibleTo, canOperate, canReadShared, canWriteMesh } from "@mtt/contracts/authz";
import { parseListFilters } from "@mtt/contracts/list-filter";
import { RETURN_PATHS, SITE_PATHS } from "@mtt/contracts/site";
import type { Context, MiddlewareHandler } from "hono";
import type { Actor } from "./auth";
import { MOCK_S3_PATH } from "./features/archive/repository";
import { TERMS_ENFORCED } from "./features/terms/terms";
import type { Store } from "./store";

export type Env = { Variables: { actor: Actor } };

export const NO_PERMISSION = { detail: "You do not have permission to perform this action." };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);

const NO_VERIFICATION = { emailVerifiedAt: null, emailVerificationSentAt: null };
export const verificationOf = (store: Store, ownerId: string) => store.verifications.get(ownerId) ?? NO_VERIFICATION;

/** Emails are unique regardless of case, so every lookup compares them this way. */
export const sameEmail = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export const operatorsOnly = (noun: string): MiddlewareHandler<Env> => async (c, next) => {
  if (!canOperate(c.get("actor"))) return c.json({ detail: `Only an operator may access ${noun}` }, 403);
  await next();
};

/** The API types `?status=` as a plain string, so these routes check it themselves; `all` lists every status. */
export function statusFilterError(statuses: readonly string[], wanted: string): Record<string, string[]> | null {
  if (wanted === "all" || statuses.includes(wanted)) return null;
  return { status: [`Must be ${statuses.join(", ")} or all.`] };
}

/** `next` must match an allowed path exactly, as in the API, so the link can't redirect elsewhere. */
export function returnPathError(next: string | undefined): Record<string, string[]> {
  return next === undefined || RETURN_PATHS.includes(next)
    ? {}
    : { next: ["This page is not an allowed return path."] };
}

export function verificationLink(token: string, next: string | undefined): string {
  return `${SITE_PATHS.verifyEmail}?${new URLSearchParams(next ? { next, token } : { token })}`;
}
export const PASSWORD_RESET_TTL_HOURS = 1; // keep in sync with meshtastic-things REGISTRY__PASSWORD_RESET_TTL_HOURS
export const INACTIVE_ALLOWED_PATHS = new Set(["/owners/me", "/owners/me/resend-verification"]);

/** A terms route answers 404 on an instance that doesn't enforce terms. */
export const termsEnforced: MiddlewareHandler<Env> = async (c, next) => {
  if (!TERMS_ENFORCED) return c.json({ detail: "Terms are not enforced on this instance" }, 404);
  await next();
};

/** `?owned=` as the API reads it: `true` or `1`, any case. */
export function queryFlag(c: Context, name: string): boolean {
  return ["true", "1"].includes((c.req.query(name) ?? "").toLowerCase());
}

export function queryFilters(c: { req: { query: (name: string) => string | undefined } }, fields: readonly string[]) {
  const query: Record<string, string | undefined> = {};
  for (const field of fields) query[field] = c.req.query(field);
  return parseListFilters(query);
}

type ParseIssue = { path: PropertyKey[]; message: string };
type SafeParse<T> = { success: true; data: T } | { success: false; error: { issues: ParseIssue[] } };
type Schema<T> = { safeParse: (data: unknown) => SafeParse<T> };
type Parsed<T> = { data: T } | { error: Record<string, string[]> };

function parseWith<T>(schema: Schema<T>, input: unknown): Parsed<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: fieldErrors(parsed.error.issues) };
  return { data: parsed.data };
}

/** DRF answers a bad body with `{ field: [message] }`; so does the mock. */
export async function parseBody<T>(c: Context, schema: Schema<T>): Promise<Parsed<T>> {
  return parseWith(schema, await c.req.json().catch(() => null));
}

/** A bad query string is answered the same way. Query values are text, so pass a generated schema only for its text fields. */
export function parseQuery<T>(c: Context, schema: Schema<T>): Parsed<T> {
  return parseWith(schema, c.req.query());
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
    (method === "GET" && path === "/protocols") ||
    // Presigned: the signature in the link is the authorisation.
    (method === "GET" && path.startsWith(MOCK_S3_PATH))
  );
}

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
  if (!mesh || !canReadShared(actor, mesh)) return null;
  return mesh;
}

export async function deviceForRead(store: Store, actor: Actor, uuid: string) {
  const device = await store.devices.get(uuid);
  if (!device) return null;
  const mesh = await meshForRead(store, actor, device.meshId);
  if (!mesh || !visibleToReader(actor, mesh, device)) return null;
  return device;
}

/** The device and its mesh for a write, or the status and body to answer with. */
export async function deviceForWrite(store: Store, actor: Actor, uuid: string) {
  const device = await deviceForRead(store, actor, uuid);
  if (!device) return { status: 404 as const, body: { detail: "Not found" } };
  const mesh = await store.meshes.get(device.meshId);
  if (!mesh || !canWriteMesh(actor, mesh)) return { status: 403 as const, body: NO_PERMISSION };
  return { device, mesh };
}
