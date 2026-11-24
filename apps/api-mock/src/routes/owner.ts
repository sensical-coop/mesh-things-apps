import type { Env } from "../http";
import type { RouteRuntime } from "../runtime";
import {
  AccountTermsAcceptance,
  OwnerCreate,
  OwnerLogin,
  OwnerRequestPasswordReset,
  OwnerResetPassword,
  OwnerUpdate,
  ResendVerification,
} from "@mtt/contracts";
import { canReadOwnerEmail } from "@mtt/contracts/authz";
import type { Actor } from "../auth";
import { gatewayBrokerFromEnv } from "../features/broker/repository";
import {
  acceptAccountTerms,
  termsJson,
  termsLocale,
  termsVersionError,
} from "../features/terms/terms";
import { secondsUntilResendAllowed } from "@mtt/contracts/resend-cooldown";
import { newId, nowIso } from "@mtt/domain/shared/ids";
import { SITE_PATHS } from "@mtt/contracts/site";
import { Hono } from "hono";
import { setOwnerPassword } from "../auth";
import {
  ownerPublicJson,
} from "../serialize";

import {
  PASSWORD_RESET_TTL_HOURS, returnPathError, sameEmail, verificationLink, verificationOf,
  parseBody, fieldErrors, termsEnforced,
  applySetCookie,
} from "../http";

const mockApiKey = (secret: string) => `mtt_mock_${secret}`;

export function registerOwnerRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db, auth, deleteMesh, issueVerificationToken, revokeVerificationTokens, ownerRead, ownerProfile, ownerWithApiKey } = rt;
  /** Emails are unique regardless of case; `exceptId` is the owner changing their own address. */
  const emailTaken = (email: string, exceptId?: string) =>
    [...db.actors.values()].some((other) => other.id !== exceptId && sameEmail(other.email, email));
  app.get("/owners/csrf-cookie", (c) => c.json({ detail: "ok" }));

  app.post("/owners/login", async (c) => {
    const parsed = await parseBody(c, OwnerLogin);
    if ("error" in parsed) return c.json(parsed.error, 400);
    try {
      const result = await auth.api.signInEmail({
        body: { email: parsed.data.email, password: parsed.data.password },
        headers: c.req.raw.headers,
        returnHeaders: true,
      });
      const actor = db.actors.get(result.response.user.id);
      if (!actor) return c.json({ detail: "Invalid email or password" }, 401);
      // Like the API, an unverified owner is signed in and only reaches its own account.
      applySetCookie(c, result.headers);
      actor.lastLogin = nowIso();
      return c.json(await ownerProfile(actor));
    } catch {
      return c.json({ detail: "Invalid email or password" }, 401);
    }
  });

  app.post("/owners/request-password-reset", async (c) => {
    const parsed = await parseBody(c, OwnerRequestPasswordReset);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const actor = [...db.actors.values()].find((candidate) => sameEmail(candidate.email, parsed.data.email));
    if (actor) {
      for (const [existingToken, entry] of db.passwordResetTokens) {
        if (entry.ownerId === actor.id) db.passwordResetTokens.delete(existingToken);
      }
      const token = newId();
      db.passwordResetTokens.set(token, { ownerId: actor.id, sentAt: nowIso() });
      console.info(`[mock] password reset link for ${actor.email}: ${SITE_PATHS.resetPassword}?token=${token}`);
    }
    return c.json({ detail: "If an account exists for that email, a reset link has been sent." });
  });

  app.post("/owners/reset-password", async (c) => {
    const parsed = await parseBody(c, OwnerResetPassword);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const { token, new_password: newPassword } = parsed.data;
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
    const parsed = await parseBody(c, OwnerCreate);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const { name, email, password } = parsed.data;
    const termsError = termsVersionError("account", parsed.data.terms_version);
    if (Object.keys(termsError).length) return c.json(termsError, 400);
    const nextError = returnPathError(parsed.data.next);
    if (Object.keys(nextError).length) return c.json(nextError, 400);
    if (emailTaken(email)) {
      return c.json({ detail: `Owner with email ${email} already exists` }, 409);
    }
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
      sourceRateAlertsEnabled: false,
    };
    db.actors.set(actor.id, actor);
    // Signing up accepts the current account terms; they don't lapse, as an account stores no mesh data.
    acceptAccountTerms(db.accountTerms, actor.id);
    const token = issueVerificationToken(actor.id);
    db.verifications.set(actor.id, { emailVerifiedAt: null, emailVerificationSentAt: now });
    console.info(`[mock] verification link for ${email}: ${verificationLink(token, parsed.data.next)}`);
    return c.json(ownerWithApiKey(actor, mockApiKey(token)), 201);
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
    const previous = verificationOf(db, ownerId);
    db.verifications.set(ownerId, { ...previous, emailVerifiedAt: now });
    return c.json({ detail: "Your email address has been verified." });
  });

  app.post("/owners/me/rotate-key", (c) => {
    const actor = c.get("actor");
    return c.json(ownerWithApiKey(actor, mockApiKey(newId())));
  });

  app.post("/owners/me/resend-verification", async (c) => {
    const body: unknown = await c.req.json().catch(() => undefined);
    const parsed = ResendVerification.safeParse(body);
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const next = parsed.data.next;
    const nextError = returnPathError(next);
    if (Object.keys(nextError).length) return c.json(nextError, 400);
    const actor = c.get("actor");
    const info = verificationOf(db, actor.id);
    const waitSeconds = secondsUntilResendAllowed(info.emailVerificationSentAt ?? null, Date.now());
    if (waitSeconds > 0) {
      return c.json({ detail: `Please wait ${waitSeconds}s before requesting another email.` }, 429);
    }
    const token = issueVerificationToken(actor.id);
    const now = nowIso();
    db.verifications.set(actor.id, { ...info, emailVerificationSentAt: now });
    console.info(`[mock] verification link for ${actor.email}: ${verificationLink(token, next)}`);
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
    return c.json(await ownerProfile(actor));
  });

  app.get("/owners/me/gateway-broker", (c) => {
    const broker = gatewayBrokerFromEnv();
    if (!broker) return c.json({ detail: "No gateway broker configured" }, 404);
    c.header("Cache-Control", "no-store");
    return c.json(broker);
  });

  app.put("/owners/me", async (c) => {
    const actor = c.get("actor");
    const parsed = await parseBody(c, OwnerUpdate);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const patch = parsed.data;
    if (patch.name !== undefined) actor.name = patch.name;
    if (patch.alarm_email_cooldown_seconds !== undefined) {
      actor.alarmEmailCooldownSeconds = patch.alarm_email_cooldown_seconds;
    }
    if (patch.status_alerts_enabled !== undefined) actor.statusAlertsEnabled = patch.status_alerts_enabled;
    if (patch.source_rate_alerts_enabled !== undefined) {
      actor.sourceRateAlertsEnabled = patch.source_rate_alerts_enabled;
    }
    if (patch.email !== undefined && patch.email !== actor.email) {
      if (emailTaken(patch.email, actor.id)) return c.json({ detail: "That email address is already in use." }, 400);
      actor.email = patch.email;
      actor.isActive = false;
      const token = issueVerificationToken(actor.id);
      db.verifications.set(actor.id, { emailVerifiedAt: null, emailVerificationSentAt: nowIso() });
      console.info(`[mock] verification link for ${actor.email}: ${verificationLink(token, undefined)}`);
    }
    return c.json(ownerRead(actor));
  });

  app.delete("/owners/me", async (c) => {
    const actor = c.get("actor");
    const ownedMeshes = (await db.meshes.list()).filter((mesh) => mesh.ownerId === actor.id);
    for (const mesh of ownedMeshes) await deleteMesh(mesh, actor.id);
    // The owner's sinks go too: their credentials are revoked and consumers disconnected.
    for (const sink of await db.sinks.list()) {
      if (sink.createdById === actor.id) await db.sinks.delete(sink.id);
    }
    // Blueprints other owners' devices still run are kept, ownerless and left to superusers.
    db.blueprints = db.blueprints.flatMap((blueprint) => {
      if (blueprint.ownerId !== actor.id) return [blueprint];
      return db.postprocessings.some((row) => row.blueprintId === blueprint.id) ? [{ ...blueprint, ownerId: null }] : [];
    });
    revokeVerificationTokens(actor.id);
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
      return c.json(rows.map((row) => ownerRead(row)));
    }
    return c.json(rows.map(ownerPublicJson));
  });

  app.get("/owners/:owner_id", (c) => {
    const actor = c.get("actor");
    const subject = db.actors.get(c.req.param("owner_id"));
    if (!subject) return c.json({ detail: "Not found" }, 404);
    if (canReadOwnerEmail(actor, subject)) {
      return c.json(ownerRead(subject));
    }
    return c.json(ownerPublicJson(subject));
  });
  app.get("/terms", termsEnforced, (c) => c.json(termsJson("account", termsLocale(c.req.query("locale")))));

  app.post("/owners/me/terms-acceptance", termsEnforced, async (c) => {
    const actor = c.get("actor");
    const parsed = await parseBody(c, AccountTermsAcceptance);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const termsError = termsVersionError("account", parsed.data.terms_version);
    if (Object.keys(termsError).length) return c.json(termsError, 400);
    acceptAccountTerms(db.accountTerms, actor.id);
    return c.json(ownerRead(actor), 201);
  });
}
