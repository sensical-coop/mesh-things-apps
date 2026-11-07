import type { Env } from "../http";
import type { RouteRuntime } from "../runtime";
import {
  SourceCreateRequest,
  SourceTermsAcceptance,
  SourceUpdateRequest,
} from "@mtt/contracts";
import {
  canManageSources,
  visibleSources,
} from "@mtt/contracts/authz";
import {
  TERMS_ENFORCED,
  TERMS_VERSIONS,
  termsJson,
  termsLocale,
} from "../features/terms/terms";
import { Hono } from "hono";
import {
  sourceReadJson,
} from "../serialize";

import { OPERATORS_ONLY, parseBody, credentialErrors, sourceErrors, bridgeFails } from "../http";

export function registerSourceRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db, acceptTerms, recordAcceptance, cancelMeshDeletions, sourceForOperator } = rt;
  app.get("/sources", async (c) => {
    const actor = c.get("actor");
    if (!canManageSources(actor)) return c.json(OPERATORS_ONLY, 403);
    return c.json(visibleSources(actor, await db.sources.list()).map((source) => sourceReadJson(source)));
  });

  app.post("/sources", async (c) => {
    const actor = c.get("actor");
    if (!canManageSources(actor)) return c.json(OPERATORS_ONLY, 403);
    const parsed = await parseBody(c, SourceCreateRequest);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const input = parsed.data;
    const terms = acceptTerms("source", input.terms_version, actor.id, termsLocale(input.terms_locale), null, false);
    const errors = {
      ...sourceErrors(input),
      ...credentialErrors(input.username, input.password),
      ...("error" in terms ? terms.error : {}),
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
    const parsed = await parseBody(c, SourceTermsAcceptance);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const terms = acceptTerms("source", parsed.data.terms_version, actor.id, termsLocale(parsed.data.terms_locale), source.id, false);
    if ("error" in terms) return c.json(terms.error, 400);
    if (source.pausedAt && bridgeFails(source)) {
      return c.json({ detail: "Failed to restart the bridge, terms NOT renewed: connection refused" }, 502);
    }
    // Renewing restarts a paused bridge and cancels the deletion of its meshes' data.
    if (source.pausedAt) {
      const attached = (await db.meshes.list()).filter((mesh) => mesh.sourceId === source.id);
      cancelMeshDeletions(attached.map((mesh) => mesh.id), "terms_lapsed", source.id);
    }
    source.termsAcceptedVersion = TERMS_ENFORCED ? TERMS_VERSIONS.source : null;
    source.termsExpiresAt = recordAcceptance("source", actor.id, termsLocale(parsed.data.terms_locale), source.id);
    source.pausedAt = null;
    return c.json(sourceReadJson(source), 201);
  });

  app.post("/sources/:source_id/restart", async (c) => {
    const actor = c.get("actor");
    if (!canManageSources(actor)) return c.json(OPERATORS_ONLY, 403);
    const source = await sourceForOperator(actor, c.req.param("source_id"));
    if (!source) return c.json({ detail: "Source not found" }, 404);
    if (source.pausedAt) return c.json({ detail: "Source is paused; renew its terms to restart it" }, 409);
    if (bridgeFails(source)) return c.json({ detail: "Failed to restart the bridge: connection refused" }, 502);
    return c.json(sourceReadJson(source));
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
    const parsed = await parseBody(c, SourceUpdateRequest);
    if ("error" in parsed) return c.json(parsed.error, 400);
    // Any subset of the fields; "" or null removes the password and keeps the username.
    const input = parsed.data;
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

}
