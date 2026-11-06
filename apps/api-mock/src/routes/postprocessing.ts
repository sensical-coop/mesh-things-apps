import type { Env } from "../http";
import type { RouteRuntime } from "../runtime";
import { DevicePostprocessingWrite, PostprocessingBackfillRequest, StepCalibrationRequest } from "@mtt/contracts";
import type { Device } from "@mtt/domain/device/Device";
import { canWriteMesh, type Actor } from "@mtt/domain/authz/authz";
import { Hono } from "hono";
import {
  addCalibration,
  attachedPostprocessing,
  createBackfill,
  createPostprocessing,
  deleteCalibration,
  deletePostprocessing,
  postprocessingProblems,
  toleranceFor,
  updatePostprocessing,
  versionOf,
  type PostprocessingRow,
} from "../features/postprocessing/repository";
import { backfillJson, calibrationJson, postprocessingJson } from "../serialize";
import { NO_PERMISSION, parseBody, deviceForRead } from "../http";

export function registerPostprocessingRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db } = rt;

  async function postprocessingBody(row: PostprocessingRow, device: Device) {
    const resolved = versionOf(db, row);
    if (!resolved) throw new Error(`Postprocessing ${row.id} lost its blueprint version`);
    const types = await db.measurements.list();
    return postprocessingJson(
      row,
      resolved.blueprint,
      toleranceFor(row, device.readingIntervalSeconds),
      (output) => types.find((type) => type.id === output.measurementTypeId)?.channel ?? `derived.${output.fieldName}`,
      await postprocessingProblems(db, row, device),
    );
  }

  async function deviceForWrite(actor: Actor, deviceUuid: string) {
    const device = await deviceForRead(db, actor, deviceUuid);
    if (!device) return { error: 404 as const };
    const mesh = await db.meshes.get(device.meshId);
    if (!mesh || !canWriteMesh(actor, mesh)) return { error: 403 as const };
    return { device, mesh };
  }

  app.get("/devices/:device_uuid/postprocessings", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const rows = db.postprocessings.filter((row) => row.deviceUuid === device.uuid);
    return c.json(await Promise.all(rows.map((row) => postprocessingBody(row, device))));
  });

  app.post("/devices/:device_uuid/postprocessings", async (c) => {
    const actor = c.get("actor");
    const found = await deviceForWrite(actor, c.req.param("device_uuid"));
    if (found.error) return c.json(found.error === 404 ? { detail: "Not found" } : NO_PERMISSION, found.error);
    const parsed = await parseBody(c, DevicePostprocessingWrite);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const created = await createPostprocessing(db, actor, found.device, found.mesh.ownerId, parsed.data);
    if ("status" in created) return c.json(created.body, created.status);
    return c.json(await postprocessingBody(created.row, found.device), 201);
  });

  app.get("/devices/:device_uuid/postprocessings/:postprocessing_id", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    const row = device ? attachedPostprocessing(db, device, c.req.param("postprocessing_id")) : undefined;
    if (!device || !row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    return c.json(await postprocessingBody(row, device));
  });

  app.put("/devices/:device_uuid/postprocessings/:postprocessing_id", async (c) => {
    const found = await deviceForWrite(c.get("actor"), c.req.param("device_uuid"));
    if (found.error) return c.json(found.error === 404 ? { detail: "Not found" } : NO_PERMISSION, found.error);
    const row = attachedPostprocessing(db, found.device, c.req.param("postprocessing_id"));
    if (!row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const parsed = await parseBody(c, DevicePostprocessingWrite);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const updated = await updatePostprocessing(db, found.device, row, parsed.data);
    if ("status" in updated) return c.json(updated.body, updated.status);
    return c.json(await postprocessingBody(updated.row, found.device));
  });

  app.delete("/devices/:device_uuid/postprocessings/:postprocessing_id", async (c) => {
    const found = await deviceForWrite(c.get("actor"), c.req.param("device_uuid"));
    if (found.error) return c.json(found.error === 404 ? { detail: "Not found" } : NO_PERMISSION, found.error);
    const row = attachedPostprocessing(db, found.device, c.req.param("postprocessing_id"));
    if (!row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const removed = deletePostprocessing(db, found.device, row);
    if ("status" in removed) return c.json(removed.body, removed.status);
    return c.body(null, 204);
  });

  app.get("/devices/:device_uuid/postprocessings/:postprocessing_id/calibrations", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    const row = device ? attachedPostprocessing(db, device, c.req.param("postprocessing_id")) : undefined;
    if (!device || !row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const history = db.calibrations
      .filter((calibration) => calibration.postprocessingId === row.id)
      .sort((a, b) => a.stepKey.localeCompare(b.stepKey) || a.validFrom.localeCompare(b.validFrom));
    return c.json(history.map(calibrationJson));
  });

  app.post("/devices/:device_uuid/postprocessings/:postprocessing_id/calibrations", async (c) => {
    const found = await deviceForWrite(c.get("actor"), c.req.param("device_uuid"));
    if (found.error) return c.json(found.error === 404 ? { detail: "Not found" } : NO_PERMISSION, found.error);
    const row = attachedPostprocessing(db, found.device, c.req.param("postprocessing_id"));
    if (!row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const parsed = await parseBody(c, StepCalibrationRequest);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const created = addCalibration(db, row, parsed.data);
    if ("status" in created) return c.json(created.body, created.status);
    return c.json(calibrationJson(created.calibration), 201);
  });

  app.delete("/devices/:device_uuid/postprocessings/:postprocessing_id/calibrations/:calibration_id", async (c) => {
    const found = await deviceForWrite(c.get("actor"), c.req.param("device_uuid"));
    if (found.error) return c.json(found.error === 404 ? { detail: "Not found" } : NO_PERMISSION, found.error);
    const row = attachedPostprocessing(db, found.device, c.req.param("postprocessing_id"));
    if (!row) return c.json({ detail: "Not found" }, 404);
    const removed = await deleteCalibration(db, found.device, row, c.req.param("calibration_id"));
    if ("status" in removed) return c.json(removed.body, removed.status);
    return c.body(null, 204);
  });

  app.get("/devices/:device_uuid/postprocessings/:postprocessing_id/backfills", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    const row = device ? attachedPostprocessing(db, device, c.req.param("postprocessing_id")) : undefined;
    if (!device || !row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const rows = db.backfills.filter((backfill) => backfill.postprocessingId === row.id);
    return c.json([...rows].reverse().map(backfillJson));
  });

  app.post("/devices/:device_uuid/postprocessings/:postprocessing_id/backfills", async (c) => {
    const found = await deviceForWrite(c.get("actor"), c.req.param("device_uuid"));
    if (found.error) return c.json(found.error === 404 ? { detail: "Not found" } : NO_PERMISSION, found.error);
    const row = attachedPostprocessing(db, found.device, c.req.param("postprocessing_id"));
    if (!row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const parsed = await parseBody(c, PostprocessingBackfillRequest);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const created = await createBackfill(db, found.device, row, parsed.data);
    if ("status" in created) return c.json(created.body, created.status);
    return c.json(backfillJson(created.backfill), 202);
  });
}
