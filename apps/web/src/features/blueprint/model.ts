import type { Algorithm, BlueprintVersion, PostprocessingBlueprint, PostprocessingStep } from "@mtt/contracts";
import {
  canAttachBlueprint as mayAttachBlueprint,
  canWriteBlueprint,
  viewerOf,
  type ProfileFlags,
} from "@mtt/contracts/authz";
import { slotRef, stepRef, validateBlueprintStep, validateBlueprintVersion, type BlueprintProblem } from "@mtt/contracts/blueprint";
import { formatParam, parseParam, stringMap, valueMap } from "../../lib/algorithm-params.ts";

export function canEditBlueprint(
  blueprint: Pick<PostprocessingBlueprint, "owner_id">,
  me: ProfileFlags | undefined,
): boolean {
  if (!me) return false;
  return canWriteBlueprint(viewerOf(me), { ownerId: blueprint.owner_id, isPublic: false });
}

/** The registry's attach rule: the device's mesh owner's own blueprints, and public ones. */
export function canAttachBlueprint(
  blueprint: Pick<PostprocessingBlueprint, "owner_id" | "is_public">,
  meshOwnerId: string,
  me: ProfileFlags | undefined,
): boolean {
  if (!me) return false;
  return mayAttachBlueprint(viewerOf(me), { ownerId: blueprint.owner_id, isPublic: blueprint.is_public }, meshOwnerId);
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

/** Only params that were typed; blank ones fall back to the algorithm default. */
export function paramValues(params: Record<string, string>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, text]) => text.trim() !== "")
      .map(([name, text]) => [name, parseParam(text.trim())]),
  );
}

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
  | { kind: "duplicateOrder" }
  | { kind: "slotName"; slot: string }
  | { kind: "slotTwice"; slot: string }
  | { kind: "slotUnused"; slot: string }
  | { kind: "stepKey"; key: string }
  | { kind: "stepKeyTwice"; key: string }
  | { kind: "inputUnset"; key: string; input: string }
  | { kind: "extraInput"; key: string; input: string }
  | { kind: "paramRequired"; key: string; param: string }
  | { kind: "calibrationParam"; key: string; param: string }
  | { kind: "extraParam"; key: string; param: string }
  | { kind: "noOutput"; key: string }
  | { kind: "extraOutput"; key: string; output: string }
  | { kind: "fieldName"; key: string; field: string }
  | { kind: "fieldTwice"; field: string }
  | { kind: "pointwise"; key: string; name: string; mode: string }
  | { kind: "unknownAlgorithm"; key: string; name: string };

function algorithmOf(algorithms: readonly Algorithm[], name: string): Algorithm | undefined {
  return algorithms.find((candidate) => candidate.name === name);
}

function listed(problem: BlueprintProblem, key: "inputs" | "params" | "outputs" | "slots"): string[] {
  return [...(problem[key] ?? [])];
}

/** One validator code as the editor's problems. Step codes carry the step `key`. */
function fromProblem(problem: BlueprintProblem): DraftProblem[] {
  const key = problem.key ?? "";
  switch (problem.code) {
    case "no_steps":
      return [{ kind: "noSteps" }];
    case "duplicate_order":
      return [{ kind: "duplicateOrder" }];
    case "slot_name":
      return [{ kind: "slotName", slot: problem.slot ?? "" }];
    case "duplicate_slots":
      return listed(problem, "slots").map((slot) => ({ kind: "slotTwice", slot }));
    case "unused_slots":
      return listed(problem, "slots").map((slot) => ({ kind: "slotUnused", slot }));
    case "step_key":
      return [{ kind: "stepKey", key }];
    case "step_key_twice":
      return [{ kind: "stepKeyTwice", key }];
    case "bad_ref":
      return [{ kind: "inputUnset", key, input: problem.input ?? "" }];
    case "missing_inputs":
      return listed(problem, "inputs").map((input) => ({ kind: "inputUnset", key, input }));
    case "extra_inputs":
      return listed(problem, "inputs").map((input) => ({ kind: "extraInput", key, input }));
    case "missing_params":
      return listed(problem, "params").map((param) => ({ kind: "paramRequired", key, param }));
    case "calibration_params":
      return listed(problem, "params").map((param) => ({ kind: "calibrationParam", key, param }));
    case "unknown_params":
      return listed(problem, "params").map((param) => ({ kind: "extraParam", key, param }));
    case "missing_output":
      return [{ kind: "noOutput", key }];
    case "extra_outputs":
      return listed(problem, "outputs").map((output) => ({ kind: "extraOutput", key, output }));
    case "field_name":
      return [{ kind: "fieldName", key, field: problem.field ?? "" }];
    case "field_twice":
      return [{ kind: "fieldTwice", field: problem.field ?? "" }];
    case "not_pointwise":
      return [{ kind: "pointwise", key, name: problem.name ?? "", mode: problem.mode ?? "" }];
    case "unknown_algorithm":
      return [{ kind: "unknownAlgorithm", key, name: problem.name ?? "" }];
  }
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
  const version = validateBlueprintVersion(body.inputs, steps, (name) => algorithmOf(algorithms, name));
  const perStep = steps.flatMap((step) => validateBlueprintStep(step, algorithmOf(algorithms, step.function_name)));
  return [...version, ...perStep].flatMap(fromProblem);
}
