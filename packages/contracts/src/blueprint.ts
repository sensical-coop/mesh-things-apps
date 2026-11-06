export const NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
export const PREFIX_PATTERN = /^[a-z0-9_]*$/;

const SLOT_REF = "slot:";
const STEP_REF = "step:";

export type StepRef = { kind: "slot"; slot: string } | { kind: "step"; key: string; output: string };

/** `slot:<slot>` or `step:<key>.<output>`; null for anything else. */
export function parseRef(ref: string): StepRef | null {
  if (ref.startsWith(SLOT_REF)) return { kind: "slot", slot: ref.slice(SLOT_REF.length) };
  if (!ref.startsWith(STEP_REF)) return null;
  const [key, output] = ref.slice(STEP_REF.length).split(".");
  return key && output ? { kind: "step", key, output } : null;
}

export function slotRef(slot: string): string {
  return `${SLOT_REF}${slot}`;
}

export function stepRef(key: string, output: string): string {
  return `${STEP_REF}${key}.${output}`;
}

export type BlueprintAlgorithm = {
  name: string;
  mode: string;
  inputs: readonly string[];
  outputs: readonly string[];
  params: readonly { name: string; calibration: boolean; required: boolean }[];
};

export type BlueprintStepCheck = {
  key: string;
  order: number;
  function_name: string;
  inputs: Record<string, string>;
  params: Record<string, unknown>;
  outputs: Record<string, string>;
};

/** The mock's message when a step's algorithm is not pointwise. Null when it may run. */
export function pointwiseModeError(key: string, spec: Pick<BlueprintAlgorithm, "name" | "mode"> | undefined): string | null {
  if (!spec || spec.mode === "pointwise") return null;
  return `Step '${key}': '${spec.name}' is ${spec.mode}, only pointwise algorithms can run`;
}

/** A step against its algorithm's declaration. Calibration params belong to each device, not the recipe. */
export function validateBlueprintStep(step: BlueprintStepCheck, spec: BlueprintAlgorithm | undefined): string[] {
  const name = step.function_name;
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
export function validateBlueprintVersion(
  inputs: readonly { slot: string }[],
  steps: readonly BlueprintStepCheck[],
  algorithm: (name: string) => BlueprintAlgorithm | undefined,
): string[] {
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
    const spec = algorithm(step.function_name);
    const mode = pointwiseModeError(key, spec);
    if (mode) errors.push(mode);
    for (const [arg, ref] of Object.entries(step.inputs)) {
      const parsed = parseRef(ref);
      if (parsed?.kind === "slot" && slots.includes(parsed.slot)) {
        usedSlots.add(parsed.slot);
      } else if (!(parsed?.kind === "step" && produced.has(ref.slice(STEP_REF.length)))) {
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
