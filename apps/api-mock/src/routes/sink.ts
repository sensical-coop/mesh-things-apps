import type { Env } from "../http";
import type { RouteRuntime } from "../runtime";
import {
  SinkCreate,
  SinkTermsAcceptance,
  SinkWrite,
} from "@mtt/contracts";
import {
  canManageSinks,
  visibleSinks,
} from "@mtt/contracts/authz";
import { orderStreams } from "@mtt/contracts/sink";
import type { Sink } from "@mtt/domain/sink/Sink";
import { SINKS_ENABLED } from "../features/sink/repository";
import {
  TERMS_ENFORCED,
  TERMS_VERSIONS,
  termsJson,
  termsLocale,
} from "../features/terms/terms";
import { Hono } from "hono";
import {
  sinkCredentialsJson,
  sinkReadJson,
} from "../serialize";

import { NO_SINKS, SINK_OPERATORS_ONLY, parseBody } from "../http";

export function registerSinkRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db, acceptTerms, sinkForOperator, sinkTargetErrors } = rt;
  const sinkConnections = (sink: Sink) => db.sinks.connections.get(sink.id) ?? 0;
  const uniqueIds = (ids: readonly string[] | undefined) => (ids ? [...new Set(ids)] : undefined);

  app.get("/sinks", async (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    return c.json(visibleSinks(actor, await db.sinks.list()).map((sink) => sinkReadJson(sink, sinkConnections(sink))));
  });

  app.post("/sinks", async (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    const parsed = await parseBody(c, SinkCreate);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const input = parsed.data;
    const terms = acceptTerms("sink", input.terms_version, actor.id, termsLocale(input.terms_locale), null, false);
    const errors = {
      ...(input.streams && input.streams.length === 0 ? { streams: ["This list may not be empty."] } : {}),
      ...(await sinkTargetErrors(actor, input)),
      ...("error" in terms ? terms.error : {}),
    };
    if (Object.keys(errors).length) return c.json(errors, 400);
    const sink = await db.sinks.insert({
      label: input.label?.trim() || null,
      streams: orderStreams(input.streams ?? ["decoded"]),
      meshIds: uniqueIds(input.mesh_ids),
      deviceIds: uniqueIds(input.device_ids),
      createdById: actor.id,
    });
    const accepted = acceptTerms("sink", input.terms_version, actor.id, termsLocale(input.terms_locale));
    sink.termsAcceptedVersion = TERMS_ENFORCED ? TERMS_VERSIONS.sink : null;
    sink.termsExpiresAt = "expiresAt" in accepted ? accepted.expiresAt : null;
    return c.json(sinkCredentialsJson(sink, 0), 201);
  });

  app.get("/sinks/terms", (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    return c.json(termsJson("sink", termsLocale(c.req.query("locale"))));
  });

  app.post("/sinks/:sink_id/terms-acceptance", async (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    const sink = await sinkForOperator(actor, c.req.param("sink_id"));
    if (!sink) return c.json({ detail: "Sink not found" }, 404);
    if (sink.createdById !== actor.id) {
      return c.json({ detail: "Only the operator who created this sink can accept its terms" }, 403);
    }
    const parsed = await parseBody(c, SinkTermsAcceptance);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const terms = acceptTerms("sink", parsed.data.terms_version, actor.id, termsLocale(parsed.data.terms_locale));
    if ("error" in terms) return c.json(terms.error, 400);
    // Renewing resumes a paused sink with the same credentials; a sink stores nothing to restore.
    sink.termsAcceptedVersion = TERMS_ENFORCED ? TERMS_VERSIONS.sink : null;
    sink.termsExpiresAt = terms.expiresAt;
    sink.pausedAt = null;
    return c.json(sinkReadJson(sink, sinkConnections(sink)), 201);
  });

  app.get("/sinks/:sink_id", async (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    const sink = await sinkForOperator(actor, c.req.param("sink_id"));
    if (!sink) return c.json({ detail: "Sink not found" }, 404);
    return c.json(sinkReadJson(sink, sinkConnections(sink)));
  });

  app.put("/sinks/:sink_id", async (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    const sink = await sinkForOperator(actor, c.req.param("sink_id"));
    if (!sink) return c.json({ detail: "Sink not found" }, 404);
    const parsed = await parseBody(c, SinkWrite);
    if ("error" in parsed) return c.json(parsed.error, 400);
    // Any subset; a list sent replaces the current one, a list left out is kept.
    const input = parsed.data;
    const errors = {
      ...(input.streams && input.streams.length === 0 ? { streams: ["This list may not be empty."] } : {}),
      ...(await sinkTargetErrors(actor, input)),
    };
    if (Object.keys(errors).length) return c.json(errors, 400);
    const updated = await db.sinks.update(sink.id, {
      label: input.label === undefined ? undefined : input.label?.trim() || null,
      streams: input.streams ? orderStreams(input.streams) : undefined,
      meshIds: uniqueIds(input.mesh_ids),
      deviceIds: uniqueIds(input.device_ids),
    });
    if (!updated) return c.json({ detail: "Sink not found" }, 404);
    return c.json(sinkReadJson(updated, sinkConnections(updated)));
  });

  app.post("/sinks/:sink_id/credentials", async (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    const sink = await sinkForOperator(actor, c.req.param("sink_id"));
    if (!sink) return c.json({ detail: "Sink not found" }, 404);
    // A new password, and connected consumers are dropped.
    const rotated = await db.sinks.rotate(sink.id);
    if (!rotated) return c.json({ detail: "Sink not found" }, 404);
    return c.json(sinkCredentialsJson(rotated, 0));
  });

  app.delete("/sinks/:sink_id", async (c) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    const actor = c.get("actor");
    if (!canManageSinks(actor)) return c.json(SINK_OPERATORS_ONLY, 403);
    const sink = await sinkForOperator(actor, c.req.param("sink_id"));
    if (!sink) return c.json({ detail: "Sink not found" }, 404);
    if (sink.meshIds.length > 0 || sink.deviceIds.length > 0) {
      return c.json({ detail: "Sink has meshes or devices attached; detach them first" }, 409);
    }
    await db.sinks.delete(sink.id);
    return c.body(null, 204);
  });
}
