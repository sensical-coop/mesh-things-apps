import type {
  Algorithm,
  AlgorithmParam,
  BlueprintVersion,
  OwnerProfile,
  PostprocessingBlueprint,
  PostprocessingStep,
} from "@mtt/contracts";

// The registry's naming rules for slots, step keys and derived fields (api/registry/postprocessing.py).
export const NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
export const PREFIX_PATTERN = /^[a-z0-9_]*$/;
const SLOT_REF = "slot:";
const STEP_REF = "step:";

export function canEditBlueprint(
  blueprint: Pick<PostprocessingBlueprint, "owner_id">,
  me: Pick<OwnerProfile, "id" | "is_superuser"> | undefined,
): boolean {
  if (!me) return false;
  return me.is_superuser === true || (blueprint.owner_id !== null && blueprint.owner_id === me.id);
}

/** The registry's attach rule: the device's mesh owner's own blueprints, and public ones. */
export function canAttachBlueprint(
  blueprint: Pick<PostprocessingBlueprint, "owner_id" | "is_public">,
  meshOwnerId: string,
  me: Pick<OwnerProfile, "is_superuser"> | undefined,
): boolean {
  return me?.is_superuser === true || blueprint.is_public || blueprint.owner_id === meshOwnerId;
}

/** A step's `inputs` / `outputs`: `{ name: string }`, which the schema leaves untyped. */
export function stringMap(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

/** A step's `params` or a calibration's. */
export function valueMap(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return { ...value };
}

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

export function configParams(algorithm: Pick<Algorithm, "params"> | undefined): AlgorithmParam[] {
  return (algorithm?.params ?? []).filter((param) => !param.calibration);
}

export function calibrationParams(algorithm: Pick<Algorithm, "params"> | undefined): AlgorithmParam[] {
  return (algorithm?.params ?? []).filter((param) => param.calibration);
}

/** The derived fields a version writes, in step order. */
export function versionOutputFields(version: Pick<BlueprintVersion, "steps">): string[] {
  return [...version.steps]
    .sort((a, b) => a.order - b.order)
    .flatMap((step) => Object.values(stringMap(step.outputs)));
}

/** One slot of a version being edited. `id` only keys the row in the form. */
export type SlotDraft = { id: string; slot: string; defaultChannel: string };

/** One step being edited. Params hold the text typed; see `parseParam`. */
export type StepDraft = {
  id: string;
  key: string;
  functionName: string;
  inputs: Record<string, string>;
  params: Record<string, string>;
  outputs: Record<string, string>;
};

export type BlueprintDraft = { slots: SlotDraft[]; steps: StepDraft[]; notes: string };

let draftIds = 0;
export function draftId(): string {
  draftIds += 1;
  return `draft-${draftIds}`;
}

export function emptyDraft(): BlueprintDraft {
  return { slots: [], steps: [], notes: "" };
}

/** A version as an editable draft, to start the next one from. */
export function draftFromVersion(version: Pick<BlueprintVersion, "inputs" | "steps">): BlueprintDraft {
  return {
    slots: version.inputs.map((input) => ({ id: draftId(), slot: input.slot, defaultChannel: input.default_channel ?? "" })),
    steps: [...version.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        id: draftId(),
        key: step.key,
        functionName: step.function_name,
        inputs: stringMap(step.inputs),
        params: Object.fromEntries(
          Object.entries(valueMap(step.params)).map(([name, value]) => [name, formatParam(value)]),
        ),
        outputs: stringMap(step.outputs),
      })),
    notes: "",
  };
}

/** A new step for an algorithm: inputs read slots of the same name, outputs keep the algorithm's names. */
export function stepForAlgorithm(algorithm: Algorithm, takenKeys: readonly string[]): StepDraft {
  let key = algorithm.name;
  for (let n = 2; takenKeys.includes(key); n += 1) key = `${algorithm.name}_${n}`;
  return {
    id: draftId(),
    key,
    functionName: algorithm.name,
    inputs: Object.fromEntries(algorithm.inputs.map((input) => [input, slotRef(input)])),
    params: {},
    outputs: Object.fromEntries(algorithm.outputs.map((output) => [output, output])),
  };
}

/** What a step input can read: a declared slot, or an output of an earlier step. */
export function refChoices(draft: BlueprintDraft, stepIndex: number): { value: string; slot?: string; step?: string; output?: string }[] {
  const slots = draft.slots.filter((slot) => slot.slot).map((slot) => ({ value: slotRef(slot.slot), slot: slot.slot }));
  const earlier = draft.steps.slice(0, stepIndex).flatMap((step) =>
    Object.entries(step.outputs)
      .filter(([, field]) => field)
      .map(([output]) => ({ value: stepRef(step.key, output), step: step.key, output })),
  );
  return [...slots, ...earlier];
}

export function formatParam(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** Typed param text as a value: JSON when it parses (numbers, lists), otherwise the text itself. */
export function parseParam(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Only params that were typed; blank ones fall back to the algorithm default. */
export function paramValues(params: Record<string, string>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, text]) => text.trim() !== "")
      .map(([name, text]) => [name, parseParam(text.trim())]),
  );
}

/** The `inputs` + `steps` of a version body. */
export function versionBody(draft: BlueprintDraft): { inputs: { slot: string; default_channel: string | null }[]; steps: PostprocessingStep[]; notes: string | null } {
  return {
    inputs: draft.slots.map((slot) => ({ slot: slot.slot.trim(), default_channel: slot.defaultChannel.trim() || null })),
    steps: draft.steps.map((step, order) => ({
      key: step.key.trim(),
      order,
      function_name: step.functionName,
      inputs: step.inputs,
      params: paramValues(step.params),
      outputs: Object.fromEntries(Object.entries(step.outputs).filter(([, field]) => field.trim() !== "").map(([name, field]) => [name, field.trim()])),
    })),
    notes: draft.notes.trim() || null,
  };
}

export type DraftProblem =
  | { kind: "noSteps" }
  | { kind: "slotName"; slot: string }
  | { kind: "slotTwice"; slot: string }
  | { kind: "slotUnused"; slot: string }
  | { kind: "stepKey"; key: string }
  | { kind: "stepKeyTwice"; key: string }
  | { kind: "inputUnset"; key: string; input: string }
  | { kind: "paramRequired"; key: string; param: string }
  | { kind: "noOutput"; key: string }
  | { kind: "fieldName"; key: string; field: string }
  | { kind: "fieldTwice"; field: string };

/** What the registry would refuse, found before sending. The API stays the judge. */
export function draftProblems(draft: BlueprintDraft, algorithms: readonly Algorithm[]): DraftProblem[] {
  const found: DraftProblem[] = [];
  if (!draft.steps.length) found.push({ kind: "noSteps" });
  const slots = draft.slots.map((slot) => slot.slot.trim());
  for (const [i, slot] of slots.entries()) {
    if (!NAME_PATTERN.test(slot)) found.push({ kind: "slotName", slot });
    else if (slots.indexOf(slot) !== i) found.push({ kind: "slotTwice", slot });
  }
  const used = new Set<string>();
  const keys: string[] = [];
  const fields: string[] = [];
  for (const [index, step] of draft.steps.entries()) {
    const key = step.key.trim();
    if (!NAME_PATTERN.test(key)) found.push({ kind: "stepKey", key });
    else if (keys.includes(key)) found.push({ kind: "stepKeyTwice", key });
    keys.push(key);
    const algorithm = algorithms.find((candidate) => candidate.name === step.functionName);
    const choices = refChoices(draft, index).map((choice) => choice.value);
    for (const input of algorithm?.inputs ?? []) {
      const ref = step.inputs[input] ?? "";
      if (!choices.includes(ref)) found.push({ kind: "inputUnset", key, input });
      const parsed = parseRef(ref);
      if (parsed?.kind === "slot") used.add(parsed.slot);
    }
    for (const param of configParams(algorithm)) {
      if (param.required && !step.params[param.name]?.trim()) found.push({ kind: "paramRequired", key, param: param.name });
    }
    const outputs = Object.values(step.outputs).map((field) => field.trim()).filter(Boolean);
    if (!outputs.length) found.push({ kind: "noOutput", key });
    for (const field of outputs) {
      if (!NAME_PATTERN.test(field)) found.push({ kind: "fieldName", key, field });
      else if (fields.includes(field)) found.push({ kind: "fieldTwice", field });
      fields.push(field);
    }
  }
  for (const slot of slots) {
    if (NAME_PATTERN.test(slot) && !used.has(slot)) found.push({ kind: "slotUnused", slot });
  }
  return found;
}

/** Every message in an error body, however DRF nested it (`{steps: [{function_name: [...]}]}`, or a bare list). */
export function errorMessages(error: unknown): string[] {
  if (typeof error === "string") return [error];
  if (Array.isArray(error)) return error.flatMap(errorMessages);
  if (typeof error !== "object" || error === null) return [];
  return Object.entries(error).flatMap(([key, value]) => (key === "status" ? [] : errorMessages(value)));
}
