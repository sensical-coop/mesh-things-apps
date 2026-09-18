import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import type { Actor, Role } from "@mtt/domain/authz/authz";
import { nowIso } from "@mtt/domain/shared/ids";
import { createStore, type Store } from "./store";
import {
  OWNER_ADMIN_EMAIL,
  OWNER_ADMIN_PASSWORD,
  OWNER_BO_EMAIL,
  OWNER_BO_PASSWORD,
  OWNER_EMAIL,
  OWNER_PASSWORD,
  OWNER_STAFF_EMAIL,
  OWNER_STAFF_PASSWORD,
} from "./store";

export const SESSION_COOKIE_NAME = "mtt_session";

const t0 = "2026-01-01T00:00:00.000Z";

export const SEED_ACCOUNTS = [
  { key: "ada", email: OWNER_EMAIL, password: OWNER_PASSWORD, name: "Ada Owner", role: "owner" as const },
  { key: "bo", email: OWNER_BO_EMAIL, password: OWNER_BO_PASSWORD, name: "Bo Owner", role: "owner" as const },
  { key: "admin", email: OWNER_ADMIN_EMAIL, password: OWNER_ADMIN_PASSWORD, name: "Admin Superuser", role: "superuser" as const },
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
  return betterAuth({
    appName: "Meshtastic Things",
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
      minPasswordLength: 8,
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
    };
    actors.set(actor.id, actor);
    ids[account.key] = actor.id;
  }
  return createStore({ adaId: ids.ada, boId: ids.bo, actors });
}

export function stampLogin(actor: Actor): Actor {
  actor.lastLogin = nowIso();
  return actor;
}
