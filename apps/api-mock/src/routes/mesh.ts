import type { Env } from "../http";
import type { RouteRuntime } from "../runtime";
import {
  MeshCreateRequest,
  MeshTermsAcceptance,
  MeshUpdate,
} from "@mtt/contracts";
import {
  canWriteCatalog,
  canSeeMeshSource,
  canSeePsk,
  canWriteMesh,
} from "@mtt/contracts/authz";
import {
  TERMS_ENFORCED,
  TERMS_VERSIONS,
  termsJson,
  termsLocale,
} from "../features/terms/terms";
import { nowIso } from "@mtt/domain/shared/ids";
import { meshFilterValue, meshListFilterFields } from "../features/mesh/filter";
import { matchesListFilters } from "@mtt/contracts/list-filter";
import { Hono } from "hono";
import {
  meshJson,
} from "../serialize";

import {
  NO_PERMISSION,
  queryFilters, parseBody,
  visibleMeshes, meshForRead,
  visibleToReader,
} from "../http";
import { meshLinksJson, meshTraceroutesJson } from "../present";

export function registerMeshRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db, detachFromSinks, deleteDevice, devicesJson, telemetryVariantQuery, reportsVariants, canAttachSource, acceptTerms, scheduleMeshDeletion, cancelMeshDeletions, meshTermsCurrent } = rt;
  app.get("/meshes", async (c) => {
    const actor = c.get("actor");
    const owned = ["true", "1"].includes((c.req.query("owned") ?? "").toLowerCase());
    const sourceId = c.req.query("source_id");
    if (sourceId !== undefined && !/^[0-9a-f-]{36}$/i.test(sourceId)) {
      return c.json({ source_id: ["Must be a UUID."] }, 400);
    }
    const filters = queryFilters(c, meshListFilterFields);
    const meshes = (await visibleMeshes(db, actor)).filter(
      (mesh) =>
        matchesListFilters((field) => meshFilterValue(mesh, field), filters) &&
        (!owned || mesh.ownerId === actor.id) &&
        (!sourceId || mesh.sourceId === sourceId),
    );
    return c.json(meshes.map((m) => meshJson(m, canSeePsk(actor, m), canSeeMeshSource(actor, m))));
  });

  app.post("/meshes", async (c) => {
    const actor = c.get("actor");
    if (!canWriteCatalog(actor)) {
      return c.json(NO_PERMISSION, 403);
    }
    const parsed = await parseBody(c, MeshCreateRequest);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const sourceId = parsed.data.source_id ?? null;
    if (sourceId !== null && !(await canAttachSource(actor, sourceId, null))) {
      return c.json({ source_id: [`Invalid pk "${sourceId}" - object does not exist.`] }, 400);
    }
    // On the default broker the mesh's own terms apply; on a source, the source's.
    if (sourceId === null) {
      const terms = acceptTerms("mesh", parsed.data.terms_version, actor.id, termsLocale(parsed.data.terms_locale), null, false);
      if ("error" in terms) return c.json(terms.error, 400);
    }
    const mesh = await db.meshes.insert({
      channelId: parsed.data.channel_id,
      pskB64: parsed.data.psk_b64,
      label: parsed.data.label ?? null,
      ownerId: actor.id,
      sourceId,
      discoverGateways: parsed.data.discover_gateways ?? false,
    });
    if (sourceId === null) {
      mesh.termsAcceptedVersion = TERMS_ENFORCED ? TERMS_VERSIONS.mesh : null;
      const renewed = acceptTerms("mesh", parsed.data.terms_version, actor.id, termsLocale(parsed.data.terms_locale));
      mesh.termsExpiresAt = "expiresAt" in renewed ? renewed.expiresAt : null;
    }
    return c.json(meshJson(mesh, true), 201);
  });

  app.get("/meshes/terms", (c) => c.json(termsJson("mesh", termsLocale(c.req.query("locale")))));

  app.post("/meshes/:mesh_id/terms-acceptance", async (c) => {
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
    const terms = acceptTerms("mesh", parsed.data.terms_version, actor.id, termsLocale(parsed.data.terms_locale));
    if ("error" in terms) return c.json(terms.error, 400);
    // Renewing resumes a paused mesh and cancels the deletion its lapse scheduled.
    if (mesh.pausedAt) cancelMeshDeletions([mesh.id], "terms_lapsed", null);
    mesh.termsAcceptedVersion = TERMS_VERSIONS.mesh;
    mesh.termsExpiresAt = terms.expiresAt;
    mesh.pausedAt = null;
    return c.json(meshJson(mesh, true), 201);
  });

  app.get("/meshes/:mesh_id", async (c) => {
    const actor = c.get("actor");
    const mesh = await meshForRead(db, actor, c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Not found" }, 404);
    return c.json(meshJson(mesh, canSeePsk(actor, mesh), canSeeMeshSource(actor, mesh)));
  });

  app.get("/meshes/:mesh_id/links", async (c) => {
    const mesh = await meshForRead(db, c.get("actor"), c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Mesh not found" }, 404);
    const since = c.req.query("since") ?? "7d";
    if (!["24h", "7d", "30d"].includes(since)) return c.json({ since: ["Expected one of 24h, 7d, 30d."] }, 400);
    const node = c.req.query("node_id");
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
    if (patch.source_id && !(await canAttachSource(actor, patch.source_id, mesh.sourceId))) {
      return c.json({ source_id: [`Invalid pk "${patch.source_id}" - object does not exist.`] }, 400);
    }
    // Moving onto the default broker needs the mesh terms, unless it already holds a current acceptance.
    const toDefault = patch.source_id === null && mesh.sourceId !== null;
    if (toDefault && !meshTermsCurrent(mesh)) {
      const terms = acceptTerms("mesh", patch.terms_version, actor.id, termsLocale(patch.terms_locale), null, false);
      if ("error" in terms) return c.json(terms.error, 400);
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
      // As a renewal: resumes a mesh an earlier lapse paused, and cancels that lapse's deletion.
      if (updated.pausedAt) cancelMeshDeletions([updated.id], "terms_lapsed", null);
      updated.termsAcceptedVersion = TERMS_ENFORCED ? TERMS_VERSIONS.mesh : null;
      const accepted = acceptTerms("mesh", patch.terms_version, actor.id, termsLocale(patch.terms_locale));
      updated.termsExpiresAt = "expiresAt" in accepted ? accepted.expiresAt : null;
      updated.pausedAt = null;
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
    return c.json(meshJson(updated, canSeePsk(actor, updated), canSeeMeshSource(actor, updated)));
  });

  app.delete("/meshes/:mesh_id", async (c) => {
    const actor = c.get("actor");
    const mesh = await meshForRead(db, actor, c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Not found" }, 404);
    if (!canWriteMesh(actor, mesh)) {
      return c.json(NO_PERMISSION, 403);
    }
    const devices = await db.devices.list({ meshId: mesh.id });
    for (const device of devices) await deleteDevice(device.uuid);
    detachFromSinks({ meshId: mesh.id });
    await db.meshes.delete(mesh.id);
    scheduleMeshDeletion(mesh.id, "mesh_deleted", { sourceId: mesh.sourceId, requestedById: actor.id });
    return c.body(null, 204);
  });
}
