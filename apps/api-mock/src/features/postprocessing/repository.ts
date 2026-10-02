import { algorithmNamed } from "../algorithm/catalog";
import type { BlueprintVersionRow } from "../blueprint/repository";

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
