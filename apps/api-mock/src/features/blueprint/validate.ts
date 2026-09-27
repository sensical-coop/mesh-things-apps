import { algorithmNamed } from "../algorithm/catalog";
import type { BlueprintInputRow, BlueprintStepRow } from "./repository";

// Mirrors meshtastic-things api/registry/postprocessing.py and common/algorithms.
export const NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
export const PREFIX_PATTERN = /^[a-z0-9_]*$/;
const SLOT_REF = "slot:";
const STEP_REF = "step:";

/** A step against its algorithm's declaration. Calibration params belong to each device, not the recipe. */
export function validateStep(step: BlueprintStepRow): string[] {
  const name = step.function_name;
  const spec = algorithmNamed(name);
  if (!spec) return [`Unknown algorithm '${name}'.`];
  const errors: string[] = [];
  const given = Object.keys(step.inputs);
  const missing = spec.inputs.filter((input) => !given.includes(input));
  if (missing.length) errors.push(`'${name}' requires input(s) ${missing.join(", ")}`);
  const extra = given.filter((input) => !spec.inputs.includes(input));
  if (extra.length) errors.push(`'${name}' does not accept input(s) ${extra.join(", ")}`);

  const params = Object.keys(step.params);
  const config = spec.params.filter((param) => !param.calibration);
  const missingParams = config.filter((param) => param.required && !params.includes(param.name));
  if (missingParams.length) errors.push(`'${name}' requires param(s) ${missingParams.map((p) => p.name).join(", ")}`);
  const misplaced = spec.params.filter((param) => param.calibration && params.includes(param.name));
  if (misplaced.length) {
    errors.push(`'${name}' param(s) ${misplaced.map((p) => p.name).join(", ")} are calibration parameters, set per device`);
  }
  const unknown = params.filter((param) => !spec.params.some((p) => p.name === param));
  if (unknown.length) errors.push(`'${name}' does not accept param(s) ${unknown.join(", ")}`);

  const outputs = Object.keys(step.outputs);
  if (!outputs.length) errors.push(`'${name}' step must bind at least one output`);
  const extraOutputs = outputs.filter((output) => !spec.outputs.includes(output));
  if (extraOutputs.length) errors.push(`'${name}' has no output(s) ${extraOutputs.join(", ")}`);
  return errors;
}

/** How a version's steps reference its slots and each other. */
export function validateVersion(inputs: BlueprintInputRow[], steps: BlueprintStepRow[]): string[] {
  if (!steps.length) return ["A blueprint version needs at least one step"];
  const orders = steps.map((step) => step.order);
  if (new Set(orders).size !== orders.length) return ["Step `order` values must be unique within a version"];
  const errors: string[] = [];
  const slots = inputs.map((entry) => entry.slot);
  for (const slot of slots) {
    if (!NAME_PATTERN.test(slot)) errors.push(`Input slot '${slot}' must be lowercase letters, digits and underscores`);
  }
  if (new Set(slots).size !== slots.length) errors.push("Input slot names must be unique");

  const keys = new Set<string>();
  const produced = new Set<string>();
  const fields = new Set<string>();
  const usedSlots = new Set<string>();
  for (const step of [...steps].sort((a, b) => a.order - b.order)) {
    const key = step.key;
    if (!NAME_PATTERN.test(key)) errors.push(`Step key '${key}' must be lowercase letters, digits and underscores`);
    if (keys.has(key)) errors.push(`Step key '${key}' is used twice`);
    const spec = algorithmNamed(step.function_name);
    if (spec && spec.mode !== "pointwise") {
      errors.push(`Step '${key}': '${spec.name}' is ${spec.mode}, only pointwise algorithms can run`);
    }
    for (const [arg, ref] of Object.entries(step.inputs)) {
      if (ref.startsWith(SLOT_REF) && slots.includes(ref.slice(SLOT_REF.length))) {
        usedSlots.add(ref.slice(SLOT_REF.length));
      } else if (!(ref.startsWith(STEP_REF) && produced.has(ref.slice(STEP_REF.length)))) {
        errors.push(`Step '${key}' input '${arg}' must be "slot:<declared slot>" or "step:<earlier step key>.<output>", got '${ref}'`);
      }
    }
    for (const [output, field] of Object.entries(step.outputs)) {
      if (!NAME_PATTERN.test(field)) {
        errors.push(`Step '${key}' output field '${field}' must be lowercase letters, digits and underscores`);
      } else if (fields.has(field)) {
        errors.push(`Output field '${field}' is produced twice`);
      }
      fields.add(field);
      produced.add(`${key}.${output}`);
    }
    keys.add(key);
  }
  const unused = slots.filter((slot) => !usedSlots.has(slot));
  if (unused.length) errors.push(`Input slot(s) ${unused.join(", ")} are not used by any step`);
  return errors;
}

/** DRF's shape for a bad version: per-step serializer errors first, then the cross-step ones. */
export function versionErrors(inputs: BlueprintInputRow[], steps: BlueprintStepRow[]): Record<string, unknown> | null {
  const perStep = steps.map((step) => {
    const errors = validateStep(step);
    return errors.length ? { function_name: errors } : {};
  });
  if (perStep.some((errors) => "function_name" in errors)) return { steps: perStep };
  const errors = validateVersion(inputs, steps);
  return errors.length ? { steps: errors } : null;
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
  const missing = spec.params.filter((param) => param.calibration && param.required && !given.includes(param.name));
  if (missing.length) {
    errors.push(`'${functionName}' requires calibration param(s) ${missing.map((p) => p.name).join(", ")}`);
  }
  return errors;
}
