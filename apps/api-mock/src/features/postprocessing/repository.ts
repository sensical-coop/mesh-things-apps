import type { DevicePostprocessingWriteOutput, PostprocessingBackfillRequestOutput, StepCalibrationRequestOutput } from "@mtt/contracts";
import { PREFIX_PATTERN } from "@mtt/contracts/blueprint";
import { canAttachBlueprint, canReadBlueprint, type Actor } from "@mtt/domain/authz/authz";
import type { Device } from "@mtt/domain/device/Device";
import { newId, nowIso } from "@mtt/domain/shared/ids";
import { plainRecord } from "../blueprint/records";
import { deviceChannels } from "../device/channels";
import type { Store } from "../../store";
import { ALGORITHMS, algorithmNamed } from "../algorithm/catalog";
import { latestVersion, versionNumbered, type BlueprintRow, type BlueprintVersionRow } from "../blueprint/repository";
import { validateCalibration } from "../blueprint/validate";

/** A derived channel a postprocessing owns on its device. */
export type DerivedOutputRow = {
  fieldName: string;
  measurementId: string;
  measurementTypeId: string;
  unit: string | null;
};

/** A blueprint version applied to one device. */
export type PostprocessingRow = {
  id: string;
  deviceUuid: string;
  blueprintId: string;
  versionNumber: number;
  /** slot -> the device's measurement id. */
  bindings: Record<string, string>;
  outputPrefix: string;
  toleranceSeconds: number | null;
  isEnabled: boolean;
  outputs: DerivedOutputRow[];
  createdAt: string;
  updatedAt: string;
};

/** Append-only: each reading is processed with the calibration in force when it was taken. */
export type CalibrationRow = {
  id: string;
  postprocessingId: string;
  stepKey: string;
  functionName: string;
  params: Record<string, unknown>;
  validFrom: string;
  createdAt: string;
};

export type BackfillRow = {
  id: string;
  postprocessingId: string;
  start: string;
  stop: string;
  includeDependants: boolean;
  status: "pending" | "running" | "done" | "failed";
  pointsPublished: number;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export const DEFAULT_TOLERANCE_SECONDS = 30;
export const MAX_BACKFILL_DAYS = 90;

export function toleranceFor(row: PostprocessingRow, readingIntervalSeconds: number | null): number {
  if (row.toleranceSeconds) return row.toleranceSeconds;
  if (readingIntervalSeconds) return readingIntervalSeconds / 2;
  return DEFAULT_TOLERANCE_SECONDS;
}

/** Derived field names this postprocessing writes, prefix applied. */
export function outputFieldNames(version: BlueprintVersionRow, prefix: string): string[] {
  return version.steps.flatMap((step) => Object.values(step.outputs).map((field) => `${prefix}${field}`));
}

/** What keeps a postprocessing from being enabled; empty once it can run. */
export function problems(
  row: PostprocessingRow,
  version: BlueprintVersionRow,
  calibrations: CalibrationRow[],
  /** For a binding to another postprocessing's output: whether that one is enabled, and the channel. */
  producerOf: (measurementId: string) => { channel: string; isEnabled: boolean } | null,
): string[] {
  const found: string[] = [];
  for (const { slot } of version.inputs) {
    if (!row.bindings[slot]) found.push(`Input slot '${slot}' is not bound to a channel`);
  }
  const calibrated = new Set(calibrations.map((c) => `${c.stepKey}:${c.functionName}`));
  for (const step of version.steps) {
    const spec = algorithmNamed(step.function_name);
    if (!spec) {
      found.push(`Step '${step.key}' uses '${step.function_name}', which is no longer available`);
      continue;
    }
    const required = spec.params.filter((param) => param.calibration && param.required).map((param) => param.name);
    if (required.length && !calibrated.has(`${step.key}:${step.function_name}`)) {
      found.push(`Step '${step.key}' needs a calibration setting [${required.map((name) => `'${name}'`).join(", ")}]`);
    }
  }
  for (const [slot, measurementId] of Object.entries(row.bindings)) {
    const producer = producerOf(measurementId);
    if (producer && !producer.isEnabled) {
      found.push(`Input slot '${slot}' reads ${producer.channel}, which comes from a disabled postprocessing`);
    }
  }
  return found;
}

type Fail = { status: 400 | 403 | 404 | 409; body: unknown };

function fail(status: Fail["status"], body: unknown): Fail {
  return { status, body };
}

export function versionOf(db: Store, row: PostprocessingRow): { blueprint: BlueprintRow; version: BlueprintVersionRow } | null {
  const blueprint = db.blueprints.find((candidate) => candidate.id === row.blueprintId);
  const version = blueprint ? versionNumbered(blueprint, row.versionNumber) : undefined;
  return blueprint && version ? { blueprint, version } : null;
}

export function attachedPostprocessing(db: Store, device: Device, postprocessingId: string): PostprocessingRow | undefined {
  return db.postprocessings.find((row) => row.id === postprocessingId && row.deviceUuid === device.uuid);
}

export async function postprocessingProblems(db: Store, row: PostprocessingRow, device: Device): Promise<string[]> {
  const resolved = versionOf(db, row);
  if (!resolved) return [];
  const channels = await deviceChannels(db, device);
  return problems(
    row,
    resolved.version,
    db.calibrations.filter((calibration) => calibration.postprocessingId === row.id),
    (measurementId) => {
      const channel = channels.find((candidate) => candidate.id === measurementId);
      const producer = channel?.producedBy ? db.postprocessings.find((other) => other.id === channel.producedBy) : undefined;
      return channel && producer ? { channel: channel.type.channel, isEnabled: producer.isEnabled } : null;
    },
  );
}

async function rebind(db: Store, row: PostprocessingRow, device: Device, version: BlueprintVersionRow, requested: Record<string, string | null>) {
  const slots = version.inputs.map((entry) => entry.slot);
  const unknown = Object.keys(requested).filter((slot) => !slots.includes(slot));
  if (unknown.length) return [`No input slot(s) ${unknown.join(", ")} in this blueprint version`];
  const channels = await deviceChannels(db, device);
  const bindings: Record<string, string> = {};
  for (const entry of version.inputs) {
    const asked = entry.slot in requested ? requested[entry.slot] : row.bindings[entry.slot];
    if (asked) {
      const channel = channels.find((candidate) => candidate.id === asked);
      if (!channel) return [`Measurement ${asked} is not a channel of this device`];
      if (channel.producedBy === row.id) return ["These bindings would make this postprocessing depend on its own output"];
      bindings[entry.slot] = asked;
    } else if (!(entry.slot in requested) && entry.default_channel) {
      const channel = channels.find((candidate) => candidate.type.channel === entry.default_channel && candidate.producedBy !== row.id);
      if (channel) bindings[entry.slot] = channel.id;
    }
  }
  row.bindings = bindings;
  return [];
}

async function syncOutputs(db: Store, row: PostprocessingRow, device: Device, version: BlueprintVersionRow): Promise<string[]> {
  const fields = outputFieldNames(version, row.outputPrefix);
  const taken = db.postprocessings
    .filter((other) => other.deviceUuid === device.uuid && other.id !== row.id)
    .flatMap((other) => other.outputs.map((output) => output.fieldName));
  const clash = fields.filter((field) => taken.includes(field));
  if (clash.length) {
    return [`Derived channel(s) ${clash.map((f) => `derived.${f}`).join(", ")} already exist on this device. Set an output_prefix`];
  }
  const dropped = row.outputs.filter((output) => !fields.includes(output.fieldName));
  const readers = db.postprocessings.filter(
    (other) => other.id !== row.id && Object.values(other.bindings).some((id) => dropped.some((output) => output.measurementId === id)),
  );
  if (readers.length) return ["Another postprocessing on this device reads a channel this change would remove"];
  const channels = await deviceChannels(db, device);
  const now = nowIso();
  row.outputs = fields.map((field) => {
    const kept = row.outputs.find((output) => output.fieldName === field);
    if (kept) return kept;
    const step = version.steps.find((candidate) => Object.values(candidate.outputs).some((name) => `${row.outputPrefix}${name}` === field));
    const output = step ? Object.entries(step.outputs).find(([, name]) => `${row.outputPrefix}${name}` === field)?.[0] : undefined;
    const declared = step && output ? ALGORITHMS.find((a) => a.name === step.function_name)?.output_units[output] : undefined;
    // "@<input>" preserves the unit of whatever channel feeds that input.
    const ref = declared?.startsWith("@") && step ? step.inputs[declared.slice(1)] : undefined;
    const boundId = ref?.startsWith("slot:") ? row.bindings[ref.slice(5)] : undefined;
    const unit = declared?.startsWith("@") ? (channels.find((c) => c.id === boundId)?.type.nativeUnit ?? null) : (declared ?? null);
    const type = db.measurements.ensure(
      {
        payloadKind: "computed:derived",
        fieldName: field,
        channel: `derived.${field}`,
        origin: "computed",
        displayName: null,
        description: null,
        nativeUnit: unit,
        quantityKind: null,
        vocabularyUri: null,
      },
      now,
      newId(),
    );
    return { fieldName: field, measurementId: newId(), measurementTypeId: type.id, unit: type.nativeUnit };
  });
  return [];
}

function countAttached(db: Store, device: Device) {
  device.postprocessingCount = db.postprocessings.filter((row) => row.deviceUuid === device.uuid).length;
}

export async function createPostprocessing(
  db: Store,
  actor: Actor,
  device: Device,
  meshOwnerId: string,
  data: DevicePostprocessingWriteOutput,
): Promise<{ row: PostprocessingRow } | Fail> {
  if (!data.blueprint_id) return fail(400, { blueprint_id: ["This field is required."] });
  if (data.output_prefix !== undefined && !PREFIX_PATTERN.test(data.output_prefix)) {
    return fail(400, { output_prefix: ["Use lowercase letters, digits and underscores"] });
  }
  const blueprint = db.blueprints.find((candidate) => candidate.id === data.blueprint_id);
  if (!blueprint || !canReadBlueprint(actor, blueprint)) return fail(404, { detail: "Not found" });
  if (!canAttachBlueprint(actor, blueprint, meshOwnerId)) {
    return fail(403, { detail: "This blueprint is neither public nor owned by the device's mesh owner" });
  }
  const version = data.blueprint_version ? versionNumbered(blueprint, data.blueprint_version) : latestVersion(blueprint);
  if (!version) return fail(400, { blueprint_version: ["No such version of this blueprint"] });
  const now = nowIso();
  const row: PostprocessingRow = {
    id: newId(),
    deviceUuid: device.uuid,
    blueprintId: blueprint.id,
    versionNumber: version.number,
    bindings: {},
    outputPrefix: data.output_prefix ?? "",
    toleranceSeconds: data.tolerance_seconds ?? null,
    isEnabled: false,
    outputs: [],
    createdAt: now,
    updatedAt: now,
  };
  const errors = [...(await rebind(db, row, device, version, data.input_bindings ?? {})), ...(await syncOutputs(db, row, device, version))];
  if (errors.length) return fail(400, errors);
  db.postprocessings.push(row);
  if (data.is_enabled) {
    const found = await postprocessingProblems(db, row, device);
    if (found.length) {
      db.postprocessings = db.postprocessings.filter((candidate) => candidate.id !== row.id);
      return fail(400, { is_enabled: found });
    }
    row.isEnabled = true;
  }
  countAttached(db, device);
  return { row };
}

export async function updatePostprocessing(
  db: Store,
  device: Device,
  row: PostprocessingRow,
  data: DevicePostprocessingWriteOutput,
): Promise<{ row: PostprocessingRow } | Fail> {
  const resolved = versionOf(db, row);
  if (!resolved) return fail(404, { detail: "Postprocessing not found on this device" });
  if (data.blueprint_id && data.blueprint_id !== row.blueprintId) {
    return fail(400, { blueprint_id: ["Detach this postprocessing and attach the other blueprint instead"] });
  }
  if (data.output_prefix !== undefined && !PREFIX_PATTERN.test(data.output_prefix)) {
    return fail(400, { output_prefix: ["Use lowercase letters, digits and underscores"] });
  }
  // Work on a copy so a refused change leaves the row as it was.
  const next: PostprocessingRow = { ...row, bindings: { ...row.bindings }, outputs: [...row.outputs] };
  let version = resolved.version;
  let rewired = data.input_bindings !== undefined || data.output_prefix !== undefined;
  if (data.blueprint_version !== undefined && data.blueprint_version !== row.versionNumber) {
    const moved = versionNumbered(resolved.blueprint, data.blueprint_version);
    if (!moved) return fail(400, { blueprint_version: ["No such version of this blueprint"] });
    version = moved;
    next.versionNumber = moved.number;
    rewired = true;
  }
  if (data.output_prefix !== undefined) next.outputPrefix = data.output_prefix;
  if (data.tolerance_seconds !== undefined) next.toleranceSeconds = data.tolerance_seconds;
  if (rewired) {
    const errors = [...(await rebind(db, next, device, version, data.input_bindings ?? {})), ...(await syncOutputs(db, next, device, version))];
    if (errors.length) return fail(400, errors);
  }
  next.isEnabled = data.is_enabled ?? row.isEnabled;
  if (next.isEnabled) {
    const blockers = await postprocessingProblems(db, next, device);
    if (blockers.length) return fail(400, { is_enabled: blockers });
  }
  next.updatedAt = nowIso();
  Object.assign(row, next);
  return { row };
}

const OUTPUT_IN_USE = ["Another postprocessing on this device reads a channel this change would remove"];

export function deletePostprocessing(db: Store, device: Device, row: PostprocessingRow): { deleted: true } | Fail {
  const outputIds = new Set(row.outputs.map((output) => output.measurementId));
  if (db.postprocessings.some((other) => other.id !== row.id && Object.values(other.bindings).some((id) => outputIds.has(id)))) {
    return fail(409, OUTPUT_IN_USE);
  }
  db.postprocessings = db.postprocessings.filter((candidate) => candidate.id !== row.id);
  db.calibrations = db.calibrations.filter((calibration) => calibration.postprocessingId !== row.id);
  db.backfills = db.backfills.filter((backfill) => backfill.postprocessingId !== row.id);
  countAttached(db, device);
  return { deleted: true };
}

export function addCalibration(
  db: Store,
  row: PostprocessingRow,
  data: StepCalibrationRequestOutput,
): { calibration: CalibrationRow } | Fail {
  const resolved = versionOf(db, row);
  if (!resolved) return fail(404, { detail: "Postprocessing not found on this device" });
  const step = resolved.version.steps.find((candidate) => candidate.key === data.step_key);
  if (!step) {
    const keys = resolved.version.steps.map((candidate) => `'${candidate.key}'`).join(", ");
    return fail(400, { step_key: [`No step '${data.step_key}', expected one of [${keys}]`] });
  }
  const params = plainRecord(data.params);
  if (!params) return fail(400, { params: ["Must be an object"] });
  const errors = validateCalibration(step.function_name, params);
  if (errors.length) return fail(400, { params: errors });
  const now = nowIso();
  const calibration: CalibrationRow = {
    id: newId(),
    postprocessingId: row.id,
    stepKey: data.step_key,
    functionName: step.function_name,
    params,
    validFrom: data.valid_from ?? now,
    createdAt: now,
  };
  db.calibrations.push(calibration);
  return { calibration };
}

export async function deleteCalibration(
  db: Store,
  device: Device,
  row: PostprocessingRow,
  calibrationId: string,
): Promise<{ deleted: true } | Fail> {
  const calibration = db.calibrations.find((candidate) => candidate.id === calibrationId && candidate.postprocessingId === row.id);
  if (!calibration) return fail(404, { detail: "Not found" });
  db.calibrations = db.calibrations.filter((candidate) => candidate.id !== calibration.id);
  if (row.isEnabled && (await postprocessingProblems(db, row, device)).length) {
    db.calibrations.push(calibration);
    return fail(409, { detail: "This would leave an enabled postprocessing uncalibrated. Disable it first" });
  }
  return { deleted: true };
}

export async function createBackfill(
  db: Store,
  device: Device,
  row: PostprocessingRow,
  data: PostprocessingBackfillRequestOutput,
): Promise<{ backfill: BackfillRow } | Fail> {
  const now = nowIso();
  const stop = data.stop ?? now;
  const start = data.start;
  if (Date.parse(start) >= Date.parse(stop)) return fail(400, { start: ["Must be before stop"] });
  if (Date.parse(stop) - Date.parse(start) > MAX_BACKFILL_DAYS * 86_400_000) {
    return fail(400, { start: [`A backfill covers at most ${MAX_BACKFILL_DAYS} days. Split it`] });
  }
  const blockers = await postprocessingProblems(db, row, device);
  if (blockers.length) return fail(400, blockers);
  const backfill: BackfillRow = {
    id: newId(),
    postprocessingId: row.id,
    start,
    stop,
    includeDependants: data.include_dependants ?? false,
    status: "pending",
    pointsPublished: 0,
    error: null,
    createdAt: now,
    startedAt: null,
    finishedAt: null,
  };
  db.backfills.push(backfill);
  return { backfill };
}
