import type { Env } from "../http";
import type { RouteRuntime } from "../runtime";
import { DevicePostprocessingWrite, PostprocessingBackfillRequest, StepCalibrationRequest } from "@mtt/contracts";
import { derivedChannel } from "@mtt/contracts/blueprint";
import type { Device } from "@mtt/domain/device/Device";
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
import { deviceForRead, deviceForWrite, parseBody } from "../http";

export function registerPostprocessingRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db } = rt;

  async function postprocessingBody(row: PostprocessingRow, device: Device) {
    const resolved = versionOf(db, row);
    if (!resolved) throw new Error(`Postprocessing ${row.id} lost its blueprint version`);
    const types = db.measurements;
    return postprocessingJson(
      row,
      resolved.blueprint,
      toleranceFor(row, device.readingIntervalSeconds),
      (output) => types.find((type) => type.id === output.measurementTypeId)?.channel ?? derivedChannel(output.fieldName),
      await postprocessingProblems(db, row, device),
    );
  }

  app.get("/devices/:device_uuid/postprocessings", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const rows = db.postprocessings.filter((row) => row.deviceUuid === device.uuid);
    return c.json(await Promise.all(rows.map((row) => postprocessingBody(row, device))));
  });

  app.post("/devices/:device_uuid/postprocessings", async (c) => {
    const actor = c.get("actor");
    const found = await deviceForWrite(db, actor, c.req.param("device_uuid"));
    if ("status" in found) return c.json(found.body, found.status);
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
    const found = await deviceForWrite(db, c.get("actor"), c.req.param("device_uuid"));
    if ("status" in found) return c.json(found.body, found.status);
    const row = attachedPostprocessing(db, found.device, c.req.param("postprocessing_id"));
    if (!row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const parsed = await parseBody(c, DevicePostprocessingWrite);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const updated = await updatePostprocessing(db, found.device, row, parsed.data);
    if ("status" in updated) return c.json(updated.body, updated.status);
    return c.json(await postprocessingBody(updated.row, found.device));
  });

  app.delete("/devices/:device_uuid/postprocessings/:postprocessing_id", async (c) => {
    const found = await deviceForWrite(db, c.get("actor"), c.req.param("device_uuid"));
    if ("status" in found) return c.json(found.body, found.status);
    const row = attachedPostprocessing(db, found.device, c.req.param("postprocessing_id"));
    if (!row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const removed = deletePostprocessing(db, row);
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
    const found = await deviceForWrite(db, c.get("actor"), c.req.param("device_uuid"));
    if ("status" in found) return c.json(found.body, found.status);
    const row = attachedPostprocessing(db, found.device, c.req.param("postprocessing_id"));
    if (!row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const parsed = await parseBody(c, StepCalibrationRequest);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const created = addCalibration(db, row, parsed.data);
    if ("status" in created) return c.json(created.body, created.status);
    return c.json(calibrationJson(created.calibration), 201);
  });

  app.delete("/devices/:device_uuid/postprocessings/:postprocessing_id/calibrations/:calibration_id", async (c) => {
    const found = await deviceForWrite(db, c.get("actor"), c.req.param("device_uuid"));
    if ("status" in found) return c.json(found.body, found.status);
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
    const found = await deviceForWrite(db, c.get("actor"), c.req.param("device_uuid"));
    if ("status" in found) return c.json(found.body, found.status);
    const row = attachedPostprocessing(db, found.device, c.req.param("postprocessing_id"));
    if (!row) return c.json({ detail: "Postprocessing not found on this device" }, 404);
    const parsed = await parseBody(c, PostprocessingBackfillRequest);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const created = await createBackfill(db, found.device, row, parsed.data);
    if ("status" in created) return c.json(created.body, created.status);
    return c.json(backfillJson(created.backfill), 202);
  });
}
