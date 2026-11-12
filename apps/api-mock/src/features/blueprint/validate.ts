import { nowIso } from "@mtt/domain/shared/ids";
import {
  validateBlueprintStep,
  validateBlueprintVersion,
  type BlueprintProblem,
} from "@mtt/contracts/blueprint";
import type { Algorithm } from "@mtt/contracts";
import { algorithmNamed } from "../algorithm/catalog";
import { plainRecord, stringRecord } from "./records";
import type { BlueprintInputRow, BlueprintStepRow, BlueprintVersionRow } from "./repository";

/** The registry's English for a validator code. Byte-identical to the strings it used to return. */
export function problemMessage(problem: BlueprintProblem): string {
  const name = problem.name ?? "";
  const list = (values: readonly string[] | undefined) => (values ?? []).join(", ");
  switch (problem.code) {
    case "unknown_algorithm":
      return `Unknown algorithm '${name}'.`;
    case "missing_inputs":
      return `'${name}' requires input(s) ${list(problem.inputs)}`;
    case "extra_inputs":
      return `'${name}' does not accept input(s) ${list(problem.inputs)}`;
    case "missing_params":
      return `'${name}' requires param(s) ${list(problem.params)}`;
    case "calibration_params":
      return `'${name}' param(s) ${list(problem.params)} are calibration parameters, set per device`;
    case "unknown_params":
      return `'${name}' does not accept param(s) ${list(problem.params)}`;
    case "missing_output":
      return `'${name}' step must bind at least one output`;
    case "extra_outputs":
      return `'${name}' has no output(s) ${list(problem.outputs)}`;
    case "no_steps":
      return "A blueprint version needs at least one step";
    case "duplicate_order":
      return "Step `order` values must be unique within a version";
    case "slot_name":
      return `Input slot '${problem.slot ?? ""}' must be lowercase letters, digits and underscores`;
    case "duplicate_slots":
      return "Input slot names must be unique";
    case "step_key":
      return `Step key '${problem.key ?? ""}' must be lowercase letters, digits and underscores`;
    case "step_key_twice":
      return `Step key '${problem.key ?? ""}' is used twice`;
    case "not_pointwise":
      return `Step '${problem.key ?? ""}': '${name}' is ${problem.mode ?? ""}, only pointwise algorithms can run`;
    case "bad_ref":
      return `Step '${problem.key ?? ""}' input '${problem.input ?? ""}' must be "slot:<declared slot>" or "step:<earlier step key>.<output>", got '${problem.ref ?? ""}'`;
    case "field_name":
      return `Step '${problem.key ?? ""}' output field '${problem.field ?? ""}' must be lowercase letters, digits and underscores`;
    case "field_twice":
      return `Output field '${problem.field ?? ""}' is produced twice`;
    case "unused_slots":
      return `Input slot(s) ${list(problem.slots)} are not used by any step`;
  }
}

function messages(problems: readonly BlueprintProblem[]): string[] {
  return problems.map(problemMessage);
}

/** DRF's shape for a bad version: per-step serializer errors first, then the cross-step ones. */
export function versionErrors(inputs: BlueprintInputRow[], steps: BlueprintStepRow[]): Record<string, unknown> | null {
  const perStep = steps.map((step) => {
    const errors = messages(validateBlueprintStep(step, algorithmNamed(step.function_name)));
    return errors.length ? { function_name: errors } : {};
  });
  if (perStep.some((errors) => "function_name" in errors)) return { steps: perStep };
  const errors = messages(validateBlueprintVersion(inputs, steps, algorithmNamed));
  return errors.length ? { steps: errors } : null;
}

export function requiredCalibrationParams(spec: Algorithm) {
  return spec.params.filter((param) => param.calibration && param.required);
}

/** A step's per-device calibration: every required calibration param, and nothing that is configuration. */
export function validateCalibration(functionName: string, params: Record<string, unknown>): string[] {
  const spec = algorithmNamed(functionName);
  if (!spec) return [`Unknown algorithm '${functionName}'.`];
  const errors: string[] = [];
  const given = Object.keys(params);
  const misplaced = spec.params.filter((param) => !param.calibration && given.includes(param.name));
  if (misplaced.length) {
    errors.push(`'${functionName}' param(s) ${misplaced.map((p) => p.name).join(", ")} are configuration, set on the blueprint step`);
  }
  const unknown = given.filter((name) => !spec.params.some((param) => param.name === name));
  if (unknown.length) errors.push(`'${functionName}' does not accept param(s) ${unknown.join(", ")}`);
  const missing = requiredCalibrationParams(spec).filter((param) => !given.includes(param.name));
  if (missing.length) {
    errors.push(`'${functionName}' requires calibration param(s) ${missing.map((p) => p.name).join(", ")}`);
  }
  return errors;
}

export type VersionBody = {
  inputs: { slot: string; default_channel?: string | null }[];
  steps: { key: string; order: number; function_name: string; inputs?: unknown; params?: unknown; outputs?: unknown }[];
  notes?: string | null;
};

/** A version body as rows, or the 400 DRF would answer. */
export function versionFromBody(
  body: VersionBody,
  number: number,
): { version: BlueprintVersionRow } | { errors: Record<string, unknown> } {
  const inputs: BlueprintInputRow[] = body.inputs.map((entry) =>
    entry.default_channel ? { slot: entry.slot, default_channel: entry.default_channel } : { slot: entry.slot },
  );
  const steps: BlueprintStepRow[] = [];
  for (const step of body.steps) {
    const stepInputs = stringRecord(step.inputs);
    const params = plainRecord(step.params);
    const outputs = stringRecord(step.outputs);
    if (!stepInputs || !params || !outputs) {
      return { errors: { steps: ["Step inputs and outputs map names to strings; params is an object"] } };
    }
    steps.push({ key: step.key, order: step.order, function_name: step.function_name, inputs: stepInputs, params, outputs });
  }
  const errors = versionErrors(inputs, steps);
  if (errors) return { errors };
  return {
    version: {
      number,
      inputs,
      steps: [...steps].sort((a, b) => a.order - b.order),
      notes: body.notes ?? null,
      createdAt: nowIso(),
    },
  };
}
