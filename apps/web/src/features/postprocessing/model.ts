import type { Algorithm, BlueprintVersion, DeviceMeasurement, StepCalibration } from "@mtt/contracts";
import { calibrationParams } from "@/features/blueprint/model";

/** Channels a slot can be bound to: any of the device's, except what this postprocessing derives itself. */
export function bindableChannels(measurements: readonly DeviceMeasurement[], postprocessingId?: string): DeviceMeasurement[] {
  return measurements.filter((row) => !postprocessingId || row.produced_by !== postprocessingId);
}

export function channelLabel(row: Pick<DeviceMeasurement, "measurement_type">): string {
  const type = row.measurement_type;
  return type.display_name ? `${type.display_name} (${type.channel})` : type.channel;
}

/** Steps whose algorithm has per-device calibration parameters. */
export function calibratedSteps(
  version: Pick<BlueprintVersion, "steps">,
  algorithms: readonly Algorithm[],
): { key: string; algorithm: Algorithm }[] {
  return [...version.steps]
    .sort((a, b) => a.order - b.order)
    .flatMap((step) => {
      const algorithm = algorithms.find((candidate) => candidate.name === step.function_name);
      return algorithm && calibrationParams(algorithm).length ? [{ key: step.key, algorithm }] : [];
    });
}

/** The calibration each reading taken at `at` is processed with, per step. */
export function calibrationInForce(
  history: readonly StepCalibration[],
  stepKey: string,
  at: Date = new Date(),
): StepCalibration | undefined {
  return history
    .filter((row) => row.step_key === stepKey && (!row.valid_from || Date.parse(row.valid_from) <= at.getTime()))
    .sort((a, b) => Date.parse(a.valid_from ?? a.created_at) - Date.parse(b.valid_from ?? b.created_at))
    .at(-1);
}

/** A `datetime-local` value as ISO, or undefined when empty or unreadable. */
export function localInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}
