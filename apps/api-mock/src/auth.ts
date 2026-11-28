import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import type { Actor, Role } from "@mtt/domain/authz/authz";
import { nowIso } from "@mtt/domain/shared/ids";
import { createStore, type Store } from "./store";
import {
  OWNER_ADMIN_EMAIL,
  OWNER_ADMIN_PASSWORD,
  OWNER_BO_EMAIL,
  OWNER_BO_PASSWORD,
  OWNER_EMAIL,
  OWNER_OPERATOR_EMAIL,
  OWNER_OPERATOR_PASSWORD,
  OWNER_PASSWORD,
  OWNER_STAFF_EMAIL,
  OWNER_STAFF_PASSWORD,
} from "./store";

export const SESSION_COOKIE_NAME = "mtt_session";
/** The shortest password the mock accepts, as Django's validators do in the API. */
export const MIN_PASSWORD_LENGTH = 8;

const t0 = "2026-01-01T00:00:00.000Z";

export const SEED_ACCOUNTS = [
  { key: "ada", email: OWNER_EMAIL, password: OWNER_PASSWORD, name: "Ada Owner", role: "owner" as const },
  { key: "bo", email: OWNER_BO_EMAIL, password: OWNER_BO_PASSWORD, name: "Bo Owner", role: "owner" as const },
  { key: "admin", email: OWNER_ADMIN_EMAIL, password: OWNER_ADMIN_PASSWORD, name: "Admin Superuser", role: "superuser" as const },
  { key: "operator", email: OWNER_OPERATOR_EMAIL, password: OWNER_OPERATOR_PASSWORD, name: "Olu Operator", role: "operator" as const },
  { key: "staff", email: OWNER_STAFF_EMAIL, password: OWNER_STAFF_PASSWORD, name: "Pat Staff", role: "staff" as const },
] as const;

export type MockAuth = ReturnType<typeof createMockAuth>;

export function createMockAuth() {
  const memory: Record<string, unknown[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
  };
  const instance = betterAuth({
    appName: "Mesh Things",
    secret: "mtt-mock-better-auth-secret-not-for-prod",
    baseURL: process.env.AUTH_BASE_URL ?? "http://localhost:8787",
    basePath: "/api/auth",
    trustedOrigins: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
      "http://localhost:5177",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5176",
    ],
    database: memoryAdapter(memory),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: MIN_PASSWORD_LENGTH,
    },
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
      useSecureCookies: false,
      cookiePrefix: "mtt",
      cookies: { session_token: { name: SESSION_COOKIE_NAME } },
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
  });
  return Object.assign(instance, { _memory: memory });
}

export async function seedStore(auth: MockAuth): Promise<Store> {
  const actors = new Map<string, Actor>();
  const ids: Partial<Record<(typeof SEED_ACCOUNTS)[number]["key"], string>> = {};
  for (const account of SEED_ACCOUNTS) {
    const created = await auth.api.signUpEmail({
      body: { email: account.email, password: account.password, name: account.name },
    });
    const actor: Actor = {
      id: created.user.id,
      email: account.email,
      name: account.name,
      role: account.role satisfies Role,
      isActive: true,
      createdAt: t0,
      lastLogin: null,
      alarmEmailCooldownSeconds: null,
      statusAlertsEnabled: false,
      sourceRateAlertsEnabled: false,
    };
    actors.set(actor.id, actor);
    ids[account.key] = actor.id;
  }
  return createStore({ adaId: ids.ada, boId: ids.bo, operatorId: ids.operator, actors });
}

export function stampLogin(actor: Actor): Actor {
  actor.lastLogin = nowIso();
  return actor;
}

/** Overwrites the credential-provider password hash for an owner, bypassing better-auth's
 * own session/reset-token flow (this mock uses its own reset-token scheme, see app.ts). */
export async function setOwnerPassword(auth: MockAuth, ownerId: string, newPassword: string): Promise<void> {
  const accounts = auth._memory.account as Array<Record<string, unknown>>;
  const account = accounts.find((row) => row.providerId === "credential" && row.userId === ownerId);
  if (!account) return;
  account.password = await hashPassword(newPassword);
}

/** Whether `password` is the owner's current credential password. */
export async function ownerPasswordMatches(auth: MockAuth, ownerId: string, password: string): Promise<boolean> {
  const accounts = auth._memory.account as Array<Record<string, unknown>>;
  const account = accounts.find((row) => row.providerId === "credential" && row.userId === ownerId);
  return typeof account?.password === "string" && verifyPassword({ hash: account.password, password });
}

/** Signs the owner out everywhere except `keepSessionId`, as the API does after a password change. */
export function revokeOtherSessions(auth: MockAuth, ownerId: string, keepSessionId: string | null): void {
  const sessions = auth._memory.session as Array<Record<string, unknown>>;
  const kept = sessions.filter((session) => session.userId !== ownerId || session.id === keepSessionId);
  // In place: the auth library holds this same array.
  sessions.splice(0, sessions.length, ...kept);
}
