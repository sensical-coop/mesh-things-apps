import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { hashPassword } from "better-auth/crypto";
import type { Role } from "@mtt/contracts/authz";
import { DEV_PORTS } from "@mtt/contracts/site";

/** The mock's owner record. Satisfies `Viewer` (`id`, `role`, `isActive`) with no mapping. */
export type Actor = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  alarmEmailCooldownSeconds: number | null;
  statusAlertsEnabled: boolean;
  /** Emails about this owner's sources that stay busier than the instance allows. */
  sourceRateAlertsEnabled: boolean;
};
import { SEED_EPOCH, createStore, type Store } from "./store";
import { MOCK_ACCOUNTS } from "@mtt/contracts/mock-accounts";


export const SESSION_COOKIE_NAME = "mtt_session";

const DEV_ORIGINS = [DEV_PORTS.web, DEV_PORTS.webDocker, DEV_PORTS.docs, DEV_PORTS.onboarding].flatMap((port) => [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
]);

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
    baseURL: process.env.AUTH_BASE_URL ?? `http://localhost:${DEV_PORTS.api}`,
    basePath: "/api/auth",
    trustedOrigins: DEV_ORIGINS,
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
  return Object.assign(instance, { _memory: memory });
}

export async function seedStore(auth: MockAuth): Promise<Store> {
  const actors = new Map<string, Actor>();
  const ids: Partial<Record<(typeof MOCK_ACCOUNTS)[number]["key"], string>> = {};
  for (const account of MOCK_ACCOUNTS) {
    const created = await auth.api.signUpEmail({
      body: { email: account.email, password: account.password, name: account.name },
    });
    const actor: Actor = {
      id: created.user.id,
      email: account.email,
      name: account.name,
      role: account.role satisfies Role,
      isActive: true,
      createdAt: SEED_EPOCH,
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

/** Overwrites the credential-provider password hash for an owner, bypassing better-auth's
 * own session/reset-token flow (this mock uses its own reset-token scheme, see routes/owner.ts). */
export async function setOwnerPassword(auth: MockAuth, ownerId: string, newPassword: string): Promise<void> {
  const accounts = auth._memory.account as Array<Record<string, unknown>>;
  const account = accounts.find((row) => row.providerId === "credential" && row.userId === ownerId);
  if (!account) return;
  account.password = await hashPassword(newPassword);
}
