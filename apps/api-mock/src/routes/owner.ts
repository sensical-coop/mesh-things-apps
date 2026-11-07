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
  TERMS_ENFORCED,
  TERMS_VERSIONS,
  termsJson,
  termsLocale,
} from "../features/terms/terms";
import { secondsUntilResendAllowed } from "@mtt/contracts/resend-cooldown";
import { newId, nowIso } from "@mtt/domain/shared/ids";
import { Hono } from "hono";
import { setOwnerPassword, stampLogin } from "../auth";
import {
  ownerProfileJson,
  ownerPublicJson,
  ownerReadJson,
  ownerWithApiKeyJson,
} from "../serialize";

import {
  PASSWORD_RESET_TTL_HOURS, NO_VERIFICATION, returnPathError, verificationLink,
  parseBody, fieldErrors,
  applySetCookie, devicesFor,
} from "../http";

export function registerOwnerRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db, auth, detachFromSinks, deleteDevice, devicesJson, acceptTerms, ownerTerms } = rt;
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
      stampLogin(actor);
      const verification = db.verifications.get(actor.id) ?? NO_VERIFICATION;
      return c.json(ownerProfileJson(actor, await devicesJson(actor, await devicesFor(db, actor)), verification, ownerTerms(actor.id)));
    } catch {
      return c.json({ detail: "Invalid email or password" }, 401);
    }
  });

  app.post("/owners/request-password-reset", async (c) => {
    const parsed = await parseBody(c, OwnerRequestPasswordReset);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const actor = [...db.actors.values()].find((candidate) => candidate.email === parsed.data.email);
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
    const terms = acceptTerms("account", parsed.data.terms_version, "", termsLocale(parsed.data.terms_locale), null, false);
    if ("error" in terms) return c.json(terms.error, 400);
    const nextError = returnPathError(parsed.data.next);
    if (Object.keys(nextError).length) return c.json(nextError, 400);
    if ([...db.actors.values()].some((actor) => actor.email.toLowerCase() === email.toLowerCase())) {
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
    acceptTerms("account", parsed.data.terms_version, actor.id, termsLocale(parsed.data.terms_locale));
    if (TERMS_ENFORCED) db.accountTerms.set(actor.id, TERMS_VERSIONS.account);
    const token = newId();
    db.verificationTokens.set(token, actor.id);
    const verification = { emailVerifiedAt: null, emailVerificationSentAt: now };
    db.verifications.set(actor.id, verification);
    console.info(`[mock] verification link for ${email}: ${verificationLink(token, parsed.data.next)}`);
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

  app.post("/owners/me/rotate-key", (c) => {
    const actor = c.get("actor");
    const verification = db.verifications.get(actor.id) ?? NO_VERIFICATION;
    return c.json(ownerWithApiKeyJson(actor, verification, `mtt_mock_${newId()}`, ownerTerms(actor.id)));
  });

  app.post("/owners/me/resend-verification", async (c) => {
    const body: unknown = await c.req.json().catch(() => undefined);
    const parsed = ResendVerification.safeParse(body);
    if (!parsed.success) return c.json(fieldErrors(parsed.error.issues), 400);
    const next = parsed.data.next;
    const nextError = returnPathError(next);
    if (Object.keys(nextError).length) return c.json(nextError, 400);
    const actor = c.get("actor");
    const info = db.verifications.get(actor.id) ?? NO_VERIFICATION;
    const waitSeconds = secondsUntilResendAllowed(info.emailVerificationSentAt ?? null, Date.now());
    if (waitSeconds > 0) {
      return c.json({ detail: `Please wait ${waitSeconds}s before requesting another email.` }, 429);
    }
    for (const [existingToken, ownerId] of db.verificationTokens) {
      if (ownerId === actor.id) db.verificationTokens.delete(existingToken);
    }
    const token = newId();
    db.verificationTokens.set(token, actor.id);
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
    const verification = db.verifications.get(actor.id) ?? NO_VERIFICATION;
    return c.json(ownerProfileJson(actor, await devicesJson(actor, await devicesFor(db, actor)), verification, ownerTerms(actor.id)));
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
      console.info(`[mock] verification link for ${actor.email}: ${verificationLink(token, undefined)}`);
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
  app.get("/terms", (c) => c.json(termsJson("account", termsLocale(c.req.query("locale")))));

  app.post("/owners/me/terms-acceptance", async (c) => {
    const actor = c.get("actor");
    const parsed = await parseBody(c, AccountTermsAcceptance);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const terms = acceptTerms("account", parsed.data.terms_version, actor.id, termsLocale(parsed.data.terms_locale));
    if ("error" in terms) return c.json(terms.error, 400);
    // Accepting changed account terms; nothing is paused by them.
    if (TERMS_ENFORCED) db.accountTerms.set(actor.id, TERMS_VERSIONS.account);
    const verification = db.verifications.get(actor.id) ?? NO_VERIFICATION;
    return c.json(ownerReadJson(actor, verification, ownerTerms(actor.id)), 201);
  });
}
