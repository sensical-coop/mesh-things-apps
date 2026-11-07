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

/** A validator finding: `code` plus the data a client needs to word it, at `path`. */
export type BlueprintProblem = {
  code:
    | "unknown_algorithm"
    | "missing_inputs"
    | "extra_inputs"
    | "missing_params"
    | "calibration_params"
    | "unknown_params"
    | "missing_output"
    | "extra_outputs"
    | "no_steps"
    | "duplicate_order"
    | "slot_name"
    | "duplicate_slots"
    | "step_key"
    | "step_key_twice"
    | "not_pointwise"
    | "bad_ref"
    | "field_name"
    | "field_twice"
    | "unused_slots";
  path: readonly (string | number)[];
  key?: string;
  name?: string;
  mode?: string;
  slot?: string;
  input?: string;
  output?: string;
  field?: string;
  ref?: string;
  inputs?: readonly string[];
  params?: readonly string[];
  outputs?: readonly string[];
  slots?: readonly string[];
};

function problem(code: BlueprintProblem["code"], path: readonly (string | number)[], data: Omit<BlueprintProblem, "code" | "path"> = {}): BlueprintProblem {
  return { code, path, ...data };
}

/** A step against its algorithm's declaration. Calibration params belong to each device, not the recipe. */
export function validateBlueprintStep(step: BlueprintStepCheck, spec: BlueprintAlgorithm | undefined): BlueprintProblem[] {
  const name = step.function_name;
  const path = ["steps", step.key, "function_name"] as const;
  if (!spec) return [problem("unknown_algorithm", path, { key: step.key, name })];
  const errors: BlueprintProblem[] = [];
  const given = Object.keys(step.inputs);
  const missing = spec.inputs.filter((input) => !given.includes(input));
  if (missing.length) errors.push(problem("missing_inputs", ["steps", step.key, "inputs"], { key: step.key, name, inputs: missing }));
  const extra = given.filter((input) => !spec.inputs.includes(input));
  if (extra.length) errors.push(problem("extra_inputs", ["steps", step.key, "inputs"], { key: step.key, name, inputs: extra }));

  const params = Object.keys(step.params);
  const config = spec.params.filter((param) => !param.calibration);
  const missingParams = config.filter((param) => param.required && !params.includes(param.name)).map((param) => param.name);
  if (missingParams.length) errors.push(problem("missing_params", ["steps", step.key, "params"], { key: step.key, name, params: missingParams }));
  const misplaced = spec.params.filter((param) => param.calibration && params.includes(param.name)).map((param) => param.name);
  if (misplaced.length) errors.push(problem("calibration_params", ["steps", step.key, "params"], { key: step.key, name, params: misplaced }));
  const unknown = params.filter((param) => !spec.params.some((entry) => entry.name === param));
  if (unknown.length) errors.push(problem("unknown_params", ["steps", step.key, "params"], { key: step.key, name, params: unknown }));

  const outputs = Object.keys(step.outputs);
  if (!outputs.length) errors.push(problem("missing_output", ["steps", step.key, "outputs"], { key: step.key, name }));
  const extraOutputs = outputs.filter((output) => !spec.outputs.includes(output));
  if (extraOutputs.length) errors.push(problem("extra_outputs", ["steps", step.key, "outputs"], { key: step.key, name, outputs: extraOutputs }));
  return errors;
}

/** How a version's steps reference its slots and each other. */
export function validateBlueprintVersion(
  inputs: readonly { slot: string }[],
  steps: readonly BlueprintStepCheck[],
  algorithm: (name: string) => BlueprintAlgorithm | undefined,
): BlueprintProblem[] {
  if (!steps.length) return [problem("no_steps", ["steps"])];
  const orders = steps.map((step) => step.order);
  if (new Set(orders).size !== orders.length) return [problem("duplicate_order", ["steps"])];
  const errors: BlueprintProblem[] = [];
  const slots = inputs.map((entry) => entry.slot);
  for (const slot of slots) {
    if (!NAME_PATTERN.test(slot)) errors.push(problem("slot_name", ["inputs", slot], { slot }));
  }
  const duplicateSlots = slots.filter((slot, index) => slots.indexOf(slot) !== index);
  if (duplicateSlots.length) errors.push(problem("duplicate_slots", ["inputs"], { slots: duplicateSlots }));

  const keys = new Set<string>();
  const produced = new Set<string>();
  const fields = new Set<string>();
  const usedSlots = new Set<string>();
  for (const step of [...steps].sort((a, b) => a.order - b.order)) {
    const key = step.key;
    if (!NAME_PATTERN.test(key)) errors.push(problem("step_key", ["steps", key, "key"], { key }));
    if (keys.has(key)) errors.push(problem("step_key_twice", ["steps", key, "key"], { key }));
    const spec = algorithm(step.function_name);
    if (spec && spec.mode !== "pointwise") {
      errors.push(problem("not_pointwise", ["steps", key, "function_name"], { key, name: spec.name, mode: spec.mode }));
    }
    for (const [arg, ref] of Object.entries(step.inputs)) {
      const parsed = parseRef(ref);
      if (parsed?.kind === "slot" && slots.includes(parsed.slot)) {
        usedSlots.add(parsed.slot);
      } else if (!(parsed?.kind === "step" && produced.has(ref.slice(STEP_REF.length)))) {
        errors.push(problem("bad_ref", ["steps", key, "inputs", arg], { key, input: arg, ref }));
      }
    }
    for (const [output, field] of Object.entries(step.outputs)) {
      if (!NAME_PATTERN.test(field)) {
        errors.push(problem("field_name", ["steps", key, "outputs", output], { key, output, field }));
      } else if (fields.has(field)) {
        errors.push(problem("field_twice", ["steps", key, "outputs", output], { key, output, field }));
      }
      fields.add(field);
      produced.add(`${key}.${output}`);
    }
    keys.add(key);
  }
  const unused = slots.filter((slot) => !usedSlots.has(slot));
  if (unused.length) errors.push(problem("unused_slots", ["inputs"], { slots: unused }));
  return errors;
}
