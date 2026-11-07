import type { Env } from "../http";
import type { RouteRuntime } from "../runtime";
import {
  canSeeDataDeletions,
} from "@mtt/contracts/authz";
import { Hono } from "hono";
import {
  dataDeletionJson,
} from "../serialize";

import {
  NO_PERMISSION,
} from "../http";

export function registerDataDeletionRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db } = rt;
  app.get("/data-deletions", (c) => {
    const actor = c.get("actor");
    if (!canSeeDataDeletions(actor)) {
      return c.json(NO_PERMISSION, 403);
    }
    const wanted = c.req.query("status") ?? "pending";
    if (!["pending", "cancelled", "done", "all"].includes(wanted)) {
      return c.json({ status: ["Must be pending, cancelled, done or all."] }, 400);
    }
    const meshId = c.req.query("mesh_id");
    const rows = db.dataDeletions
      .filter((row) => (wanted === "all" || row.status === wanted) && (!meshId || row.meshId === meshId))
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    return c.json(rows.map(dataDeletionJson));
  });
}
