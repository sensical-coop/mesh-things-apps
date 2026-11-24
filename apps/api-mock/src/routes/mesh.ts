import type { Env } from "../http";
import type { RouteRuntime } from "../runtime";
import {
  MeshCreateRequest,
  MeshesLinksListParams,
  MeshTermsAcceptance,
  MeshUpdate,
} from "@mtt/contracts";
import {
  canWriteCatalog,
  canWriteMesh,
} from "@mtt/contracts/authz";
import { TERMS_VERSIONS, acceptTerms, termsJson, termsLocale, termsVersionError } from "../features/terms/terms";
import { canAttachSource } from "../features/source/rules";
import { nowIso } from "@mtt/domain/shared/ids";
import { meshFilters } from "../features/mesh/filter";
import { Hono } from "hono";
import {
  meshJson,
  meshOut,
} from "../serialize";

import {
  NO_PERMISSION, isUuid,
  queryFilters, queryFlag, parseBody, parseQuery, termsEnforced,
  visibleMeshes, meshForRead,
  visibleToReader,
} from "../http";
import { meshLinksJson, meshTraceroutesJson } from "../present";

export function registerMeshRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db, deleteMesh, devicesJson, telemetryVariantQuery, reportsVariants, scheduleMeshDeletion, cancelMeshDeletions, renewMeshTerms, meshTermsCurrent } = rt;
  app.get("/meshes", async (c) => {
    const actor = c.get("actor");
    const owned = queryFlag(c, "owned");
    const sourceId = c.req.query("source_id");
    if (sourceId !== undefined && !isUuid(sourceId)) {
      return c.json({ source_id: ["Must be a UUID."] }, 400);
    }
    const filters = queryFilters(c, meshFilters.names);
    const meshes = (await visibleMeshes(db, actor)).filter(
      (mesh) =>
        meshFilters.matches(filters, mesh) &&
        (!owned || mesh.ownerId === actor.id) &&
        (!sourceId || mesh.sourceId === sourceId),
    );
    return c.json(meshes.map((m) => meshOut(actor, m)));
  });

  app.post("/meshes", async (c) => {
    const actor = c.get("actor");
    if (!canWriteCatalog(actor)) {
      return c.json(NO_PERMISSION, 403);
    }
    const parsed = await parseBody(c, MeshCreateRequest);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const sourceId = parsed.data.source_id ?? null;
    if (sourceId !== null && !(await canAttachSource(db, actor, sourceId, null))) {
      return c.json({ source_id: [`Invalid pk "${sourceId}" - object does not exist.`] }, 400);
    }
    // On the default broker the mesh's own terms apply; on a source, the source's.
    if (sourceId === null) {
      const termsError = termsVersionError("mesh", parsed.data.terms_version);
      if (Object.keys(termsError).length) return c.json(termsError, 400);
    }
    const mesh = await db.meshes.insert({
      channelId: parsed.data.channel_id,
      pskB64: parsed.data.psk_b64,
      label: parsed.data.label ?? null,
      ownerId: actor.id,
      sourceId,
      discoverGateways: parsed.data.discover_gateways ?? false,
    });
    if (sourceId === null) acceptTerms("mesh", mesh);
    return c.json(meshJson(mesh, true, true), 201);
  });

  app.get("/meshes/terms", termsEnforced, (c) => c.json(termsJson("mesh", termsLocale(c.req.query("locale")))));

  app.post("/meshes/:mesh_id/terms-acceptance", termsEnforced, async (c) => {
    const actor = c.get("actor");
    const mesh = await meshForRead(db, actor, c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Not found" }, 404);
    if (mesh.ownerId !== actor.id) {
      return c.json({ detail: "Only the mesh's owner can accept its terms" }, 403);
    }
    if (mesh.sourceId) {
      return c.json({ detail: "This mesh is on a source; its source's terms apply" }, 409);
    }
    const parsed = await parseBody(c, MeshTermsAcceptance);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const termsError = termsVersionError("mesh", parsed.data.terms_version);
    if (Object.keys(termsError).length) return c.json(termsError, 400);
    renewMeshTerms(mesh);
    return c.json(meshJson(mesh, true, true), 201);
  });

  app.get("/meshes/:mesh_id", async (c) => {
    const actor = c.get("actor");
    const mesh = await meshForRead(db, actor, c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Not found" }, 404);
    return c.json(meshOut(actor, mesh));
  });

  app.get("/meshes/:mesh_id/links", async (c) => {
    const mesh = await meshForRead(db, c.get("actor"), c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Mesh not found" }, 404);
    const query = parseQuery(c, MeshesLinksListParams);
    if ("error" in query) return c.json(query.error, 400);
    const node = query.data.node_id;
    const links = meshLinksJson((await db.devices.list({ meshId: mesh.id })).filter((d) => d.isAllowed));
    return c.json(node ? links.filter((l) => String(l.from_node) === node || String(l.to_node) === node) : links);
  });

  app.get("/meshes/:mesh_id/traceroutes", async (c) => {
    const mesh = await meshForRead(db, c.get("actor"), c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Mesh not found" }, 404);
    const limit = Math.min(Number(c.req.query("limit") ?? 50), 500);
    const devices = (await db.devices.list({ meshId: mesh.id })).filter((d) => d.isAllowed);
    return c.json(meshTraceroutesJson(devices).slice(0, limit));
  });

  app.get("/meshes/:mesh_id/devices", async (c) => {
    const actor = c.get("actor");
    const mesh = await meshForRead(db, actor, c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Not found" }, 404);
    const variants = telemetryVariantQuery(c);
    if ("error" in variants) return c.json(variants.error, 400);
    const devices = await db.devices.list({ meshId: mesh.id });
    return c.json(
      await devicesJson(
        actor,
        devices.filter((device) => visibleToReader(actor, mesh, device) && reportsVariants(device, variants.filter)),
      ),
    );
  });

  app.put("/meshes/:mesh_id", async (c) => {
    const actor = c.get("actor");
    const mesh = await meshForRead(db, actor, c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Not found" }, 404);
    if (!canWriteMesh(actor, mesh)) {
      return c.json(NO_PERMISSION, 403);
    }
    const parsed = await parseBody(c, MeshUpdate);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const patch = parsed.data;
    if (patch.source_id && !(await canAttachSource(db, actor, patch.source_id, mesh.sourceId))) {
      return c.json({ source_id: [`Invalid pk "${patch.source_id}" - object does not exist.`] }, 400);
    }
    // Moving onto the default broker needs the mesh terms, unless it already holds a current acceptance.
    const toDefault = patch.source_id === null && mesh.sourceId !== null;
    if (toDefault && !meshTermsCurrent(mesh)) {
      const termsError = termsVersionError("mesh", patch.terms_version);
      if (Object.keys(termsError).length) return c.json(termsError, 400);
    }
    const previousSource = mesh.sourceId;
    const updated = await db.meshes.update(mesh.id, {
      channelId: patch.channel_id,
      pskB64: patch.psk_b64,
      label: patch.label,
      isPublic: patch.is_public,
      sourceId: patch.source_id,
      discoverGateways: patch.discover_gateways,
    });
    if (!updated) return c.json({ detail: "Not found" }, 404);
    if (toDefault && patch.terms_version === TERMS_VERSIONS.mesh) {
      renewMeshTerms(updated);
    }
    if (patch.source_id !== undefined && patch.source_id !== previousSource) {
      // Readings bridged so far belonged to the old source's service.
      if (previousSource) {
        scheduleMeshDeletion(updated.id, "source_detached", {
          sourceId: previousSource,
          requestedById: actor.id,
          dataUntil: nowIso(),
        });
      }
      if (updated.sourceId) cancelMeshDeletions([updated.id], "source_detached", updated.sourceId);
    }
    return c.json(meshOut(actor, updated));
  });

  app.delete("/meshes/:mesh_id", async (c) => {
    const actor = c.get("actor");
    const mesh = await meshForRead(db, actor, c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Not found" }, 404);
    if (!canWriteMesh(actor, mesh)) {
      return c.json(NO_PERMISSION, 403);
    }
    await deleteMesh(mesh, actor.id);
    return c.body(null, 204);
  });
}
