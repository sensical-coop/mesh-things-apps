import type { Env } from "../http";
import type { RouteRuntime } from "../runtime";
import {
  BlueprintVersionRequest,
  PostprocessingBlueprintCreate,
  PostprocessingBlueprintUpdate,
} from "@mtt/contracts";
import {
  canWriteCatalog,
  canReadShared,
  canWriteBlueprint,
  visibleBlueprints,
} from "@mtt/contracts/authz";
import type { Actor } from "../auth";
import { Hono } from "hono";
import {
  addBlueprintVersion,
  blueprintDeviceCount,
  createBlueprint,
  deleteBlueprint,
  findBlueprint,
  latestVersion,
  updateBlueprint,
  versionNumbered,
  type BlueprintRow,
} from "../features/blueprint/repository";
import { blueprintJson, blueprintVersionJson } from "../serialize";
import { versionFromBody } from "../features/blueprint/validate";
import { NO_PERMISSION, parseBody, queryFlag } from "../http";

export function registerBlueprintRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db } = rt;

  function blueprintBody(row: BlueprintRow) {
    return blueprintJson(row, (number) => blueprintDeviceCount(db.postprocessings, row.id, number));
  }

  function readable(actor: Actor, blueprintId: string) {
    const row = findBlueprint(db.blueprints, blueprintId);
    return row && canReadShared(actor, row) ? row : null;
  }

  app.get("/postprocessing-blueprints", (c) => {
    const actor = c.get("actor");
    const owned = queryFlag(c, "owned");
    const rows = visibleBlueprints(actor, db.blueprints).filter((row) => !owned || row.ownerId === actor.id);
    return c.json(rows.map(blueprintBody));
  });

  app.post("/postprocessing-blueprints", async (c) => {
    const actor = c.get("actor");
    if (!canWriteCatalog(actor)) return c.json(NO_PERMISSION, 403);
    const parsed = await parseBody(c, PostprocessingBlueprintCreate);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const built = versionFromBody(parsed.data, 1);
    if ("errors" in built) return c.json(built.errors, 400);
    const created = createBlueprint(db.blueprints, actor.id, parsed.data, built.version);
    if ("conflict" in created) return c.json(created.conflict, 409);
    return c.json(blueprintBody(created.row), 201);
  });

  app.get("/postprocessing-blueprints/:blueprint_id", (c) => {
    const row = readable(c.get("actor"), c.req.param("blueprint_id"));
    if (!row) return c.json({ detail: "Not found" }, 404);
    return c.json(blueprintBody(row));
  });

  app.put("/postprocessing-blueprints/:blueprint_id", async (c) => {
    const actor = c.get("actor");
    const row = readable(actor, c.req.param("blueprint_id"));
    if (!row) return c.json({ detail: "Not found" }, 404);
    if (!canWriteBlueprint(actor, row)) return c.json(NO_PERMISSION, 403);
    const parsed = await parseBody(c, PostprocessingBlueprintUpdate);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const updated = updateBlueprint(db.blueprints, actor.id, row, parsed.data);
    if ("conflict" in updated) return c.json(updated.conflict, 409);
    return c.json(blueprintBody(updated.row));
  });

  app.delete("/postprocessing-blueprints/:blueprint_id", (c) => {
    const actor = c.get("actor");
    const row = readable(actor, c.req.param("blueprint_id"));
    if (!row) return c.json({ detail: "Not found" }, 404);
    if (!canWriteBlueprint(actor, row)) return c.json(NO_PERMISSION, 403);
    const removed = deleteBlueprint(db, row);
    if ("conflict" in removed) return c.json(removed.conflict, 409);
    return c.body(null, 204);
  });

  app.get("/postprocessing-blueprints/:blueprint_id/versions", (c) => {
    const row = readable(c.get("actor"), c.req.param("blueprint_id"));
    if (!row) return c.json({ detail: "Not found" }, 404);
    return c.json(row.versions.map((version) => blueprintVersionJson(row.id, version, blueprintDeviceCount(db.postprocessings, row.id, version.number))));
  });

  app.post("/postprocessing-blueprints/:blueprint_id/versions", async (c) => {
    const actor = c.get("actor");
    const row = readable(actor, c.req.param("blueprint_id"));
    if (!row) return c.json({ detail: "Not found" }, 404);
    if (!canWriteBlueprint(actor, row)) return c.json(NO_PERMISSION, 403);
    const parsed = await parseBody(c, BlueprintVersionRequest);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const built = versionFromBody(parsed.data, latestVersion(row).number + 1);
    if ("errors" in built) return c.json(built.errors, 400);
    const version = addBlueprintVersion(row, built.version);
    return c.json(blueprintVersionJson(row.id, version, 0), 201);
  });

  app.get("/postprocessing-blueprints/:blueprint_id/versions/:number", (c) => {
    const row = readable(c.get("actor"), c.req.param("blueprint_id"));
    const version = row ? versionNumbered(row, Number(c.req.param("number"))) : undefined;
    if (!row || !version) return c.json({ detail: "Blueprint version not found" }, 404);
    return c.json(blueprintVersionJson(row.id, version, blueprintDeviceCount(db.postprocessings, row.id, version.number)));
  });
}
