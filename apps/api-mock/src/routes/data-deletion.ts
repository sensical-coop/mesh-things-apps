import type { Env } from "../http";
import type { RouteRuntime } from "../runtime";
import {
  canSeeDataDeletions,
} from "@mtt/contracts/authz";
import { Hono } from "hono";
import { DataDeletionStatusEnum } from "@mtt/contracts";
import {
  dataDeletionJson,
} from "../serialize";

import { NO_PERMISSION, statusFilterError } from "../http";

export function registerDataDeletionRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db } = rt;
  app.get("/data-deletions", (c) => {
    const actor = c.get("actor");
    if (!canSeeDataDeletions(actor)) {
      return c.json(NO_PERMISSION, 403);
    }
    const wanted = c.req.query("status") ?? "pending";
    const statusError = statusFilterError(DataDeletionStatusEnum.options, wanted);
    if (statusError) return c.json(statusError, 400);
    const meshId = c.req.query("mesh_id");
    const rows = db.dataDeletions
      .filter((row) => (wanted === "all" || row.status === wanted) && (!meshId || row.meshId === meshId))
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    return c.json(rows.map(dataDeletionJson));
  });
}
