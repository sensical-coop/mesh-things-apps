import type { Env } from "../http";
import type { RouteRuntime } from "../runtime";
import { canReadArchive } from "@mtt/contracts/authz";
import type { Actor } from "../auth";
import { newId } from "@mtt/domain/shared/ids";
import { Hono } from "hono";
import {
  ARCHIVE_BUCKET,
  ARCHIVE_CREDENTIAL_TTL_S,
  ARCHIVE_ENABLED,
  ARCHIVE_ISSUES_CREDENTIALS,
  ARCHIVE_PUBLIC_ENDPOINT,
  ARCHIVE_REGION,
  meshPrefix,
  partitionKey,
} from "../features/archive/repository";

import {
  MOCK_S3_PATH, DAY_PATTERN,
} from "../http";

export function registerArchiveRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db } = rt;
  async function archiveRefusal(actor: Actor, meshId: string, credentials = false) {
    if (!(credentials ? ARCHIVE_ISSUES_CREDENTIALS : ARCHIVE_ENABLED)) return { detail: "Not found" };
    const mesh = await db.meshes.get(meshId);
    if (!mesh || !canReadArchive(actor, mesh)) return { detail: "Mesh not found" };
    return null;
  }

  app.get("/readings/archive/meshes/:mesh_id", async (c) => {
    const meshId = c.req.param("mesh_id");
    const refusal = await archiveRefusal(c.get("actor"), meshId);
    if (refusal) return c.json(refusal, 404);
    const [start, stop] = [c.req.query("start"), c.req.query("stop")];
    for (const [name, value] of [["start", start], ["stop", stop]] as const) {
      if (value && !DAY_PATTERN.test(value)) return c.json({ [name]: ["Expected a date as YYYY-MM-DD."] }, 400);
    }
    return c.json({ mesh_id: meshId, prefix: meshPrefix(meshId), partitions: db.archive.partitions(meshId, start, stop) });
  });

  app.post("/readings/archive/meshes/:mesh_id/credentials", async (c) => {
    const actor = c.get("actor");
    const meshId = c.req.param("mesh_id");
    const refusal = await archiveRefusal(actor, meshId, true);
    if (refusal) return c.json(refusal, 404);
    const token = () => newId().replaceAll("-", "");
    console.info(`[mock] archive credentials issued to ${actor.email} for mesh ${meshId}`);
    return c.json(
      {
        access_key_id: `MOCK${token().slice(0, 16).toUpperCase()}`,
        secret_access_key: token() + token().slice(0, 8),
        session_token: token() + token() + token(),
        expires_at: new Date(Date.now() + ARCHIVE_CREDENTIAL_TTL_S * 1000).toISOString(),
        endpoint: ARCHIVE_PUBLIC_ENDPOINT,
        region: ARCHIVE_REGION,
        bucket: ARCHIVE_BUCKET,
        prefix: meshPrefix(meshId),
        s3_path: `s3://${ARCHIVE_BUCKET}/${meshPrefix(meshId)}`,
      },
      201,
    );
  });

  app.get("/readings/archive/meshes/:mesh_id/partitions/:day/:hour", async (c) => {
    const meshId = c.req.param("mesh_id");
    const refusal = await archiveRefusal(c.get("actor"), meshId);
    if (refusal) return c.json(refusal, 404);
    const day = c.req.param("day");
    const hour = Number(c.req.param("hour"));
    const found = db.archive.partitions(meshId, day, day).some((p) => p.hour === hour);
    if (!DAY_PATTERN.test(day) || !found) return c.json({ detail: "Partition not found" }, 404);
    const url = new URL(`${MOCK_S3_PATH}${ARCHIVE_BUCKET}/${partitionKey(meshId, day, hour)}`, c.req.url);
    url.searchParams.set("X-Amz-Expires", String(ARCHIVE_CREDENTIAL_TTL_S));
    url.searchParams.set("X-Amz-Signature", "mock");
    return c.redirect(url.toString(), 302);
  });
}
