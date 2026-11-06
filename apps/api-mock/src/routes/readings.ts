import type { Env } from "../http";
import type { RouteRuntime } from "../runtime";
import {
  ExportRequest,
} from "@mtt/contracts";
import {
  type Actor,
} from "@mtt/domain/authz/authz";
import { Hono } from "hono";
import {
  DEVICE_NODE_ID,
  DEVICE_GW_ID,
} from "../store";
import {
  ARCHIVE_BUCKET,
  ARCHIVE_ENABLED,
  partitionKey,
} from "../features/archive/repository";
import { storedZip } from "../features/archive/zip";
import {
  EXPORT_MAX_DAYS,
  daysBetween,
  daysDone,
  expiresAt,
  exportFilename,
  finishedAt,
  statusOf,
  type ExportRow,
} from "../features/export/repository";
import {
  latestJson,
} from "../serialize";

import {
  parseBody, 
  MOCK_S3_PATH, meshForRead,
  deviceForRead,
} from "../http";
import { MESH_STATS_RANGES, meshStatsJson } from "../present";

export function registerReadingsRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db } = rt;

  function exportJson(row: ExportRow, requestUrl: string) {
    const status = statusOf(row);
    const url =
      status === "ready"
        ? new URL(`${MOCK_S3_PATH}${ARCHIVE_BUCKET}/exports/${row.meshId}/${row.id}.zip?X-Amz-Signature=mock`, requestUrl).toString()
        : null;
    const finished = status === "queued" || status === "running" ? null : new Date(finishedAt(row)).toISOString();
    return {
      id: row.id,
      mesh_id: row.meshId,
      format: row.format,
      start: row.start,
      stop: row.stop,
      node_ids: row.nodeIds,
      status,
      days_done: daysDone(row),
      days_total: daysBetween(row.start, row.stop),
      size: finished && !row.error ? row.size : null,
      error: status === "failed" ? row.error : null,
      created_at: new Date(row.createdAt).toISOString(),
      finished_at: finished,
      expires_at: new Date(expiresAt(row)).toISOString(),
      filename: exportFilename(row),
      url,
    };
  }

  /** The mesh's owner and superusers, public or not; everyone else is told it doesn't exist. */
  async function exportRefusal(actor: Actor, meshId: string) {
    if (!ARCHIVE_ENABLED) return { detail: "Not found" };
    const mesh = await db.meshes.get(meshId);
    if (!mesh || !actor.isActive || (actor.role !== "superuser" && mesh.ownerId !== actor.id)) return { detail: "Mesh not found" };
    return null;
  }

  app.get("/readings/exports", (c) => {
    if (!ARCHIVE_ENABLED) return c.json([]);
    return c.json(db.exports.listFor(c.get("actor").id).map((row) => exportJson(row, c.req.url)));
  });

  app.get("/readings/meshes/:mesh_id/stats", async (c) => {
    const mesh = await meshForRead(db, c.get("actor"), c.req.param("mesh_id"));
    if (!mesh) return c.json({ detail: "Device not found" }, 404);
    const range = c.req.query("range") ?? "24h";
    if (!(range in MESH_STATS_RANGES)) {
      return c.json({ detail: `range must be one of ${Object.keys(MESH_STATS_RANGES).join(", ")}` }, 400);
    }
    const devices = (await db.devices.list()).filter((device) => device.meshId === mesh.id && device.isAllowed);
    return c.json(meshStatsJson(mesh.id, range as keyof typeof MESH_STATS_RANGES, devices));
  });

  app.get("/readings/meshes/:mesh_id/exports", async (c) => {
    const meshId = c.req.param("mesh_id");
    const refusal = await exportRefusal(c.get("actor"), meshId);
    if (refusal) return c.json(refusal, 404);
    return c.json(db.exports.listFor(c.get("actor").id, meshId).map((row) => exportJson(row, c.req.url)));
  });

  app.post("/readings/meshes/:mesh_id/exports", async (c) => {
    const actor = c.get("actor");
    const meshId = c.req.param("mesh_id");
    const refusal = await exportRefusal(actor, meshId);
    if (refusal) return c.json(refusal, 404);
    const parsed = await parseBody(c, ExportRequest);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const { format, start, stop } = parsed.data;
    const nodeIds = parsed.data.node_ids?.length ? [...parsed.data.node_ids].sort((a, b) => a - b) : null;
    if (stop < start) return c.json({ stop: ["Must not be before start."] }, 400);
    if (daysBetween(start, stop) > EXPORT_MAX_DAYS) {
      return c.json({ stop: [`An export covers at most ${EXPORT_MAX_DAYS} days.`] }, 400);
    }
    if (format === "parquet") {
      if (nodeIds) return c.json({ node_ids: ["Only CSV exports can be limited to devices; Parquet files hold the whole mesh."] }, 400);
      if (actor.role !== "superuser" && actor.role !== "operator") return c.json({ detail: "Parquet exports need the operator role" }, 403);
      if (!db.archive.partitions(meshId, start, stop).length) return c.json({ detail: "Nothing archived in that range" }, 404);
    }
    const active = db.exports.active(actor.id);
    if (active) {
      const same =
        active.meshId === meshId && active.format === format && active.start === start && active.stop === stop &&
        JSON.stringify(active.nodeIds) === JSON.stringify(nodeIds);
      if (same) return c.json(exportJson(active, c.req.url), 200);
      return c.json({ detail: "You already have an export queued or running. Request another once it has finished." }, 429);
    }
    const devices = nodeIds?.length ?? (await db.devices.list({ meshId })).length;
    const days = daysBetween(start, stop);
    const row = db.exports.add({
      ownerId: actor.id,
      meshId,
      format,
      start,
      stop,
      nodeIds,
      createdAt: Date.now(),
      // The mock stores no readings: a range wholly in the future is the one way to get nothing.
      error: start > new Date().toISOString().slice(0, 10) ? "No readings in that range" : null,
      size: format === "csv" ? Math.max(1, devices) * days * 11_800 : db.archive.partitions(meshId, start, stop).length * 15_300,
    });
    console.info(`[mock] ${format} export ${row.id} queued for ${actor.email}`);
    return c.json(exportJson(row, c.req.url), 202);
  });

  app.get("/readings/meshes/:mesh_id/exports/:export_id", async (c) => {
    const meshId = c.req.param("mesh_id");
    const refusal = await exportRefusal(c.get("actor"), meshId);
    if (refusal) return c.json(refusal, 404);
    const row = db.exports.get(c.req.param("export_id"));
    if (!row || row.ownerId !== c.get("actor").id || row.meshId !== meshId) return c.json({ detail: "Export not found" }, 404);
    return c.json(exportJson(row, c.req.url));
  });

  // The zip a ready export's link names. CSV holds one sample file per day; Parquet the archive's hours.
  app.get(`${MOCK_S3_PATH}${ARCHIVE_BUCKET}/exports/:mesh_id/:file`, (c) => {
    const row = db.exports.get(c.req.param("file").replace(/\.zip$/, ""));
    if (!row || statusOf(row) !== "ready") return c.json({ detail: "Not found" }, 404);
    const encoder = new TextEncoder();
    const modified = new Date(finishedAt(row));
    const hour = (h: number) => String(h).padStart(2, "0");
    const entries =
      row.format === "parquet"
        ? db.archive.partitions(row.meshId, row.start, row.stop).map((p) => ({
            name: `${p.dt}/${p.dt}_${hour(p.hour)}.parquet`,
            data: encoder.encode(`PAR1 mock ${partitionKey(row.meshId, p.dt, p.hour)} PAR1`),
            modified,
          }))
        : [
            ...Array.from({ length: daysBetween(row.start, row.stop) }, (_, i) => {
              const day = new Date(Date.parse(`${row.start}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10);
              const node = row.nodeIds?.[0] ?? 1;
              return {
                name: `${day}/environment_metrics.csv`,
                data: encoder.encode(`time,node_id,relative_humidity,temperature\n${day}T12:00:00Z,${node},55.0,21.4\n`),
                modified,
              };
            }),
            {
              name: "channels.csv",
              data: encoder.encode(
                "channel,name,unit,description,telemetry_variant,derived,quantity_kind,vocabulary_uri\n" +
                  "environment_metrics.relative_humidity,relative_humidity,%,Relative humidity percent measured,telemetry:environment_metrics,false,ratio,\n" +
                  "environment_metrics.temperature,temperature,degC,Temperature measured,telemetry:environment_metrics,false,physical_property,\n",
              ),
              modified,
            },
          ];
    return c.body(storedZip(entries), 200, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${exportFilename(row)}"`,
    });
  });

  // The object a presigned link names. Not real Parquet: the mock stores no rows.
  app.get(`${MOCK_S3_PATH}*`, (c) =>
    c.body("PAR1 mock archive object: the console mock stores no readings. PAR1", 200, {
      "Content-Type": "application/vnd.apache.parquet",
      "Content-Disposition": 'attachment; filename="data.parquet"',
    }),
  );

  app.get("/readings/devices/:device_uuid/latest", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const readings = await db.readings.latest(device.uuid);
    return c.json(latestJson(device, readings));
  });

  app.get("/readings/devices/:device_uuid/traffic", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const range = c.req.query("range") ?? "24h";
    const now = Date.now();
    return c.json({
      mesh_id: device.meshId,
      node_id: device.nodeId,
      range,
      window: "6h",
      hourly_start: new Date(now - 7 * 86_400_000).toISOString(),
      packets: 186,
      receptions: 301,
      ports: [
        { portnum: 67, name: "TELEMETRY_APP", packets: 140 },
        { portnum: 3, name: "POSITION_APP", packets: 28 },
        { portnum: 4, name: "NODEINFO_APP", packets: 18 },
      ],
      points: Array.from({ length: 28 }, (_, i) => ({
        time: new Date(now - (27 - i) * 21_600_000).toISOString(),
        value: 5 + (i % 4),
      })),
    });
  });

  app.get("/readings/devices/:device_uuid/quality", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const start = c.req.query("start") ?? "-24h";
    const stop = c.req.query("stop") ?? "now()";
    if (device.uuid !== DEVICE_NODE_ID && device.uuid !== DEVICE_GW_ID) {
      return c.json({
        mesh_id: device.meshId,
        node_id: device.nodeId,
        start,
        stop,
        points_ingested: 0,
        range_ratio: null,
        alarms_by_detector: {},
        channels: [],
      });
    }
    return c.json({
      mesh_id: device.meshId,
      node_id: device.nodeId,
      start,
      stop,
      points_ingested: 190,
      range_ratio: 0.97,
      alarms_by_detector: { completeness: 1, range: 0, flat_value: 0, absence: 0 },
      channels: [
        {
          channel: "environmentmetrics.temperature",
          completeness_ratio: 0.91,
          observed: 190,
          expected: 208,
          largest_gap_seconds: 1200,
        },
      ],
    });
  });

  app.get("/readings/devices/:device_uuid", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const series = await db.readings.series(device.uuid, {
      channel: c.req.query("channel"),
      payloadKind: c.req.query("payload_kind"),
      start: c.req.query("start"),
      stop: c.req.query("stop"),
      window: c.req.query("window"),
      agg: c.req.query("agg"),
    });
    return c.json({
      mesh_id: device.meshId,
      node_id: device.nodeId,
      payload_kind: series.payloadKind,
      series: series.series,
    });
  });
}
