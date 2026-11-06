import type {
  Algorithm,
  AlgorithmParam,
  BlueprintVersion,
  OwnerProfile,
  PostprocessingBlueprint,
  PostprocessingStep,
} from "@mtt/contracts";
import { NAME_PATTERN, slotRef, stepRef, validateBlueprintStep, validateBlueprintVersion } from "@mtt/contracts/blueprint";

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
  | { kind: "fieldTwice"; field: string }
  | { kind: "pointwise"; key: string; name: string; mode: string };

function algorithmOf(algorithms: readonly Algorithm[], name: string): Algorithm | undefined {
  return algorithms.find((candidate) => candidate.name === name);
}

/** What the registry would refuse, found before sending. The API stays the judge. */
export function draftProblems(draft: BlueprintDraft, algorithms: readonly Algorithm[]): DraftProblem[] {
  const body = versionBody(draft);
  const steps = body.steps.map((step) => ({
    key: step.key,
    order: step.order,
    function_name: step.function_name,
    inputs: stringMap(step.inputs),
    params: valueMap(step.params),
    outputs: stringMap(step.outputs),
  }));
  const messages = validateBlueprintVersion(body.inputs, steps, (name) => algorithmOf(algorithms, name));
  const found: DraftProblem[] = [];
  for (const message of messages) {
    const slotName = message.match(/^Input slot '([^']+)' must be lowercase/);
    if (slotName?.[1]) found.push({ kind: "slotName", slot: slotName[1] });
    const stepKey = message.match(/^Step key '([^']+)' must be lowercase/);
    if (stepKey?.[1]) found.push({ kind: "stepKey", key: stepKey[1] });
    const stepKeyTwice = message.match(/^Step key '([^']+)' is used twice/);
    if (stepKeyTwice?.[1] && NAME_PATTERN.test(stepKeyTwice[1])) found.push({ kind: "stepKeyTwice", key: stepKeyTwice[1] });
    const pointwise = message.match(/^Step '([^']+)': '([^']+)' is ([^,]+), only pointwise/);
    if (pointwise?.[1] && pointwise[2] && pointwise[3]) {
      found.push({ kind: "pointwise", key: pointwise[1], name: pointwise[2], mode: pointwise[3] });
    }
    const input = message.match(/^Step '([^']+)' input '([^']+)' must be/);
    if (input?.[1] && input[2]) found.push({ kind: "inputUnset", key: input[1], input: input[2] });
    const fieldName = message.match(/^Step '([^']+)' output field '([^']+)' must be/);
    if (fieldName?.[1] && fieldName[2]) found.push({ kind: "fieldName", key: fieldName[1], field: fieldName[2] });
    const fieldTwice = message.match(/^Output field '([^']+)' is produced twice/);
    if (fieldTwice?.[1]) found.push({ kind: "fieldTwice", field: fieldTwice[1] });
    const unused = message.match(/^Input slot\(s\) (.+) are not used/);
    if (unused?.[1]) {
      for (const slot of unused[1].split(", ")) {
        if (NAME_PATTERN.test(slot)) found.push({ kind: "slotUnused", slot });
      }
    }
    if (message === "A blueprint version needs at least one step") found.push({ kind: "noSteps" });
    if (message === "Input slot names must be unique") {
      const slots = draft.slots.map((slot) => slot.slot.trim());
      for (const [index, slot] of slots.entries()) {
        if (NAME_PATTERN.test(slot) && slots.indexOf(slot) !== index) found.push({ kind: "slotTwice", slot });
      }
    }
  }
  for (const step of steps) {
    const spec = algorithmOf(algorithms, step.function_name);
    for (const message of validateBlueprintStep(step, spec)) {
      const missingInputs = message.match(/requires input\(s\) (.+)$/);
      if (missingInputs?.[1]) {
        for (const input of missingInputs[1].split(", ")) found.push({ kind: "inputUnset", key: step.key, input });
      }
      const missingParams = message.match(/requires param\(s\) (.+)$/);
      if (missingParams?.[1]) {
        for (const param of missingParams[1].split(", ")) found.push({ kind: "paramRequired", key: step.key, param });
      }
      if (message.endsWith("step must bind at least one output")) found.push({ kind: "noOutput", key: step.key });
    }
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
