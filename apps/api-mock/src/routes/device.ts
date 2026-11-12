import type { Env } from "../http";
import type { RouteRuntime } from "../runtime";
import {
  DeviceCreate,
  DeviceMeasurementUpdate,
  DeviceUpdate,
  TelemetryVariantMeasurementUpdate,
} from "@mtt/contracts";
import { deviceChannels } from "../features/device/channels";
import { DETECTOR_CATALOG, MEASUREMENT_DETECTORS } from "../features/device/detectors";
import { deviceListFilterFields, matchesDeviceFilters } from "../features/device/filter";
import {
  archivesFor,
  canWriteMesh,
} from "@mtt/contracts/authz";
import { newId, nowIso } from "@mtt/domain/shared/ids";
import { Hono } from "hono";
import {
  DEVICE_NODE_ID,
  DEVICE_VARIANT_ID,
  TELEMETRY_VARIANTS,
  SEED_EPOCH,
  VARIANT_ENV_ID,
  type Store,
} from "../store";
import { ALGORITHMS } from "../features/algorithm/catalog";
import {
  ARCHIVE_ENABLED,
} from "../features/archive/repository";
import {
  deviceMeasurementJson,
  measurementJson,
  telemetryVariantMeasurementJson,
} from "../serialize";

import {
  NO_PERMISSION, 
  queryFilters, parseBody, 
  devicesFor, deviceForWrite,
  deviceForRead,
} from "../http";
import { telemetryVariantJson } from "../present";

export function registerDeviceRoutes(app: Hono<Env>, rt: RouteRuntime) {
  const { db, syncArchive, devicesJson, telemetryVariantQuery, reportsVariants, deviceOut } = rt;
  app.get("/devices", async (c) => {
    const actor = c.get("actor");
    const variants = telemetryVariantQuery(c);
    if ("error" in variants) return c.json(variants.error, 400);
    const devices = (await devicesFor(db, actor)).filter(
      (device) =>
        matchesDeviceFilters(
          device,
          db.postprocessings.some((row) => row.deviceUuid === device.uuid),
          queryFilters(c, deviceListFilterFields),
        ) && reportsVariants(device, variants.filter),
    );
    return c.json(await devicesJson(actor, devices));
  });

  app.post("/devices", async (c) => {
    const actor = c.get("actor");
    const parsed = await parseBody(c, DeviceCreate);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const mesh = await db.meshes.get(parsed.data.mesh_id);
    if (!mesh) return c.json({ detail: "Mesh not found" }, 400);
    if (!canWriteMesh(actor, mesh)) {
      return c.json(NO_PERMISSION, 403);
    }
    const device = await db.devices.insert({
      nodeId: parsed.data.node_id,
      meshId: parsed.data.mesh_id,
      isGateway: parsed.data.is_gateway,
      label: parsed.data.label ?? null,
      name: parsed.data.name ?? null,
      shortName: parsed.data.short_name ?? null,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
    });
    return c.json(await deviceOut(actor, device), 201);
  });

  app.get("/devices/:device_uuid", async (c) => {
    const actor = c.get("actor");
    const device = await deviceForRead(db, actor, c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    return c.json(await deviceOut(actor, device));
  });

  app.put("/devices/:device_uuid", async (c) => {
    const actor = c.get("actor");
    const found = await deviceForWrite(db, actor, c.req.param("device_uuid"));
    if ("status" in found) return c.json(found.body, found.status);
    const { device: existing, mesh } = found;
    const parsed = await parseBody(c, DeviceUpdate);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const patch = parsed.data;
    if (patch.archive_enabled && !existing.archiveEnabled) {
      const owner = db.actors.get(mesh.ownerId);
      if (!ARCHIVE_ENABLED) return c.json({ archive_enabled: ["This instance has no archive."] }, 400);
      if (!owner || !archivesFor(owner)) {
        return c.json({ archive_enabled: ["Only devices on a mesh owned by an operator can be archived."] }, 400);
      }
    }
    const lat = patch.latitude;
    const lon = patch.longitude;
    if (patch.archive_enabled !== undefined) existing.setArchive(patch.archive_enabled, actor.id, nowIso());
    const device = await db.devices.update(c.req.param("device_uuid"), {
      label: patch.label,
      name: patch.name,
      shortName: patch.short_name,
      latitude: lat,
      longitude: lon,
      isAllowed: patch.is_allowed,
      isGateway: patch.is_gateway,
      absenceDetectionEnabled: patch.absence_detection_enabled,
      readingIntervalSeconds: patch.reading_interval_seconds,
      publishIntervalSeconds: patch.publish_interval_seconds,
      // Registry rule: sending both keys pins the location unless both are
      // null, which hands it back to the node's own position reports.
      locationOverridden: lat !== undefined && lon !== undefined ? lat != null || lon != null : undefined,
    });
    if (!device) return c.json({ detail: "Not found" }, 404);
    syncArchive(device, mesh);
    return c.json(await deviceOut(actor, device));
  });

  app.get("/devices/:device_uuid/measurements", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    return c.json((await deviceChannels(db, device)).map((channel) => deviceMeasurementJson(db, device, channel)));
  });

  app.get("/devices/:device_uuid/measurements/:measurement_id", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const found = (await deviceChannels(db, device)).find((channel) => channel.id === c.req.param("measurement_id"));
    if (!found) return c.json({ detail: "Not found" }, 404);
    return c.json(deviceMeasurementJson(db, device, found));
  });

  app.put("/devices/:device_uuid/measurements/:measurement_id", async (c) => {
    const actor = c.get("actor");
    const writable = await deviceForWrite(db, actor, c.req.param("device_uuid"));
    if ("status" in writable) return c.json(writable.body, writable.status);
    const { device } = writable;
    const found = (await deviceChannels(db, device)).find((channel) => channel.id === c.req.param("measurement_id"));
    if (!found) return c.json({ detail: "Not found" }, 404);
    const parsed = await parseBody(c, DeviceMeasurementUpdate);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const patch = parsed.data;
    if ("enabled_detectors" in patch) {
      const enabledDetectors = patch.enabled_detectors ?? null;
      const unknown = enabledDetectors && unknownDetectors(enabledDetectors);
      if (unknown) return c.json(unknown, 400);
      db.detectorOverrides.set(c.req.param("measurement_id"), enabledDetectors);
    }
    if ("valid_min" in patch || "valid_max" in patch) {
      const validMin = patch.valid_min ?? null;
      const validMax = patch.valid_max ?? null;
      if ((validMin === null) !== (validMax === null)) {
        return c.json({ detail: "valid_min and valid_max must be set or cleared together." }, 400);
      }
      db.deviceMeasurementRanges.set(c.req.param("measurement_id"), { validMin, validMax });
    }
    return c.json(deviceMeasurementJson(db, device, found));
  });

  app.get("/detectors", (c) => c.json(DETECTOR_CATALOG));

  app.get("/devices/:device_uuid/telemetry-variants", async (c) => {
    const device = await deviceForRead(db, c.get("actor"), c.req.param("device_uuid"));
    if (!device) return c.json({ detail: "Not found" }, 404);
    const reported = db.deviceTelemetryVariants.get(device.uuid) ?? [];
    return c.json(
      TELEMETRY_VARIANTS.filter((variant) => reported.includes(variant.id))
        .sort((a, b) => reported.indexOf(a.id) - reported.indexOf(b.id))
        .map((variant) => ({
          // The Porch node's environment link keeps its fixed id.
          id: device.uuid === DEVICE_NODE_ID && variant.id === VARIANT_ENV_ID ? DEVICE_VARIANT_ID : newId(),
          telemetry_variant: telemetryVariantJson(variant, device.createdAt),
          first_seen: device.createdAt,
          last_seen: device.lastSeen,
        })),
    );
  });

  app.get("/telemetry-variants", (c) =>
    c.json(TELEMETRY_VARIANTS.map((variant) => telemetryVariantJson(variant, SEED_EPOCH))),
  );

  app.get("/measurements", async (c) => {
    const rows = db.measurements;
    return c.json(rows.map(measurementJson));
  });

  app.get("/algorithms", (c) => c.json(ALGORITHMS));
  app.get("/telemetry-variants/:telemetry_variant_id/measurements", async (c) => {
    const variantId = c.req.param("telemetry_variant_id");
    const links = [...db.telemetryVariantMeasurements.entries()].filter(([, link]) => link.variantId === variantId);
    if (!links.length) return c.json([]);
    const types = db.measurements;
    const rows = [];
    for (const [linkId, link] of links) {
      const type = types.find((t) => t.id === link.measurementTypeId);
      if (type) rows.push(telemetryVariantMeasurementJson(db, type, linkId));
    }
    return c.json(rows);
  });

  app.get("/telemetry-variants/:telemetry_variant_id/measurements/:link_id", async (c) => {
    const found = variantLink(db, c.req.param("telemetry_variant_id"), c.req.param("link_id"));
    if (!found) return c.json({ detail: "Not found" }, 404);
    const { type } = found;
    return c.json(telemetryVariantMeasurementJson(db, type, found.linkId));
  });

  app.put("/telemetry-variants/:telemetry_variant_id/measurements/:link_id", async (c) => {
    const actor = c.get("actor");
    if (actor.role !== "superuser") {
      return c.json(NO_PERMISSION, 403);
    }
    const found = variantLink(db, c.req.param("telemetry_variant_id"), c.req.param("link_id"));
    if (!found) return c.json({ detail: "Not found" }, 404);
    const { type } = found;
    const parsed = await parseBody(c, TelemetryVariantMeasurementUpdate);
    if ("error" in parsed) return c.json(parsed.error, 400);
    const patch = parsed.data;
    const unknown = patch.default_enabled_detectors && unknownDetectors(patch.default_enabled_detectors);
    if (unknown) return c.json(unknown, 400);
    db.telemetryVariantMeasurements.set(found.linkId, {
      ...found.link,
      defaultEnabledDetectors: patch.default_enabled_detectors ?? found.link.defaultEnabledDetectors,
    });
    return c.json(telemetryVariantMeasurementJson(db, type, found.linkId));
  });
}

/** The 400 body for detector names the catalog doesn't know, or null when all are valid. */
function unknownDetectors(names: readonly string[]) {
  const unknown = names.filter((name) => !MEASUREMENT_DETECTORS.includes(name));
  return unknown.length
    ? { detail: `Unknown detector(s) ${unknown.join(", ")}. Valid: ${MEASUREMENT_DETECTORS.join(", ")}` }
    : null;
}

function variantLink(db: Store, variantId: string, linkId: string) {
  const link = db.telemetryVariantMeasurements.get(linkId);
  if (!link || link.variantId !== variantId) return undefined;
  const type = db.measurements.find((t) => t.id === link.measurementTypeId);
  return type && { linkId, link, type };
}
