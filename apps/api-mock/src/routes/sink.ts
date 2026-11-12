import type { Env } from "../http";
import type { RouteRuntime } from "../runtime";
import {
  SinkCreate,
  SinkTermsAcceptance,
  SinkWrite,
} from "@mtt/contracts";
import {
  visibleOperated,
} from "@mtt/contracts/authz";
import { orderStreams } from "@mtt/contracts/sink";
import type { Sink } from "@mtt/domain/sink/Sink";
import { SINKS_ENABLED, sinkForOperator, sinkTargetErrors, streamsError } from "../features/sink/repository";
import { acceptTerms, termsJson, termsLocale, termsVersionError } from "../features/terms/terms";
import { Hono } from "hono";
import {
  sinkCredentialsJson,
  sinkReadJson,
} from "../serialize";

import { operatorsOnly, parseBody, termsEnforced } from "../http";

const NO_SINKS = { detail: "Not found" };

export function registerSinkRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db } = rt;
  // Every sink route: off without EMQX, and for operators only.
  app.use("/sinks/*", async (c, next) => {
    if (!SINKS_ENABLED) return c.json(NO_SINKS, 404);
    await next();
  });
  app.use("/sinks/*", operatorsOnly("sinks"));
  const sinkConnections = (sink: Sink) => db.sinks.connections.get(sink.id) ?? 0;
  const uniqueIds = (ids: readonly string[] | undefined) => (ids ? [...new Set(ids)] : undefined);

  app.get("/sinks", async (c) => {
    const actor = c.get("actor");
    return c.json(visibleOperated(actor, await db.sinks.list()).map((sink) => sinkReadJson(sink, sinkConnections(sink))));
  });

  app.post("/sinks", async (c) => {
    const actor = c.get("actor");
    const parsed = await parseBody(c, SinkCreate);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const input = parsed.data;
    const errors = {
      ...streamsError(input.streams),
      ...(await sinkTargetErrors(db, actor, input)),
      ...termsVersionError("sink", input.terms_version),
    };
    if (Object.keys(errors).length) return c.json(errors, 400);
    const sink = await db.sinks.insert({
      label: input.label?.trim() || null,
      streams: orderStreams(input.streams ?? ["decoded"]),
      meshIds: uniqueIds(input.mesh_ids),
      deviceIds: uniqueIds(input.device_ids),
      createdById: actor.id,
    });
    acceptTerms("sink", sink);
    return c.json(sinkCredentialsJson(sink, 0), 201);
  });

  app.get("/sinks/terms", termsEnforced, (c) => {
    return c.json(termsJson("sink", termsLocale(c.req.query("locale"))));
  });

  app.post("/sinks/:sink_id/terms-acceptance", termsEnforced, async (c) => {
    const actor = c.get("actor");
    const sink = await sinkForOperator(db, actor, c.req.param("sink_id"));
    if (!sink) return c.json({ detail: "Sink not found" }, 404);
    if (sink.createdById !== actor.id) {
      return c.json({ detail: "Only the operator who created this sink can accept its terms" }, 403);
    }
    const parsed = await parseBody(c, SinkTermsAcceptance);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const termsError = termsVersionError("sink", parsed.data.terms_version);
    if (Object.keys(termsError).length) return c.json(termsError, 400);
    // Renewing resumes a paused sink with the same credentials; a sink stores nothing to restore.
    acceptTerms("sink", sink);
    return c.json(sinkReadJson(sink, sinkConnections(sink)), 201);
  });

  app.get("/sinks/:sink_id", async (c) => {
    const actor = c.get("actor");
    const sink = await sinkForOperator(db, actor, c.req.param("sink_id"));
    if (!sink) return c.json({ detail: "Sink not found" }, 404);
    return c.json(sinkReadJson(sink, sinkConnections(sink)));
  });

  app.put("/sinks/:sink_id", async (c) => {
    const actor = c.get("actor");
    const sink = await sinkForOperator(db, actor, c.req.param("sink_id"));
    if (!sink) return c.json({ detail: "Sink not found" }, 404);
    const parsed = await parseBody(c, SinkWrite);
    if ("error" in parsed) return c.json(parsed.error, 400);
    // Any subset; a list sent replaces the current one, a list left out is kept.
    const input = parsed.data;
    const errors = {
      ...streamsError(input.streams),
      ...(await sinkTargetErrors(db, actor, input)),
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
    const actor = c.get("actor");
    const sink = await sinkForOperator(db, actor, c.req.param("sink_id"));
    if (!sink) return c.json({ detail: "Sink not found" }, 404);
    // A new password, and connected consumers are dropped.
    const rotated = await db.sinks.rotate(sink.id);
    if (!rotated) return c.json({ detail: "Sink not found" }, 404);
    return c.json(sinkCredentialsJson(rotated, 0));
  });

  app.delete("/sinks/:sink_id", async (c) => {
    const actor = c.get("actor");
    const sink = await sinkForOperator(db, actor, c.req.param("sink_id"));
    if (!sink) return c.json({ detail: "Sink not found" }, 404);
    if (sink.meshIds.length > 0 || sink.deviceIds.length > 0) {
      return c.json({ detail: "Sink has meshes or devices attached; detach them first" }, 409);
    }
    await db.sinks.delete(sink.id);
    return c.body(null, 204);
  });
}
