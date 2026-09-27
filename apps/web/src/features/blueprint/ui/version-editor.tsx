import type { Algorithm } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { Input } from "@mtt/ui/components/ui/input";
import { Textarea } from "@mtt/ui/components/ui/textarea";
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { FormSelect } from "@/components/form/form-select";
import {
  draftId,
  parseRef,
  slotRef,
  stepForAlgorithm,
  stepRef,
  type BlueprintDraft,
  type StepDraft,
} from "@/features/blueprint/model";
import { StepEditor } from "@/features/blueprint/ui/step-editor";

export type VersionEditorProps = {
  draft: BlueprintDraft;
  algorithms: readonly Algorithm[];
  onChange: (draft: BlueprintDraft) => void;
  /** Shown for a new version; a new blueprint's first version needs none. */
  withNotes?: boolean;
};

/** Rewrite step inputs that read `from` so they read `to` instead. */
function renameRefs(steps: StepDraft[], rename: (ref: string) => string): StepDraft[] {
  return steps.map((step) => ({
    ...step,
    inputs: Object.fromEntries(Object.entries(step.inputs).map(([input, ref]) => [input, rename(ref)])),
  }));
}

/** The inputs a recipe reads (slots, bound per device) and the ordered steps computing from them. */
export function VersionEditor({ draft, algorithms, onChange, withNotes = false }: VersionEditorProps): ReactElement {
  const { formatMessage } = useIntl();
  const [adding, setAdding] = useState("");
  const pointwise = algorithms.filter((algorithm) => algorithm.mode === "pointwise");

  function renameSlot(index: number, slot: string) {
    const before = draft.slots[index]?.slot ?? "";
    const slots = draft.slots.map((row, i) => (i === index ? { ...row, slot } : row));
    const steps = renameRefs(draft.steps, (ref) => (before && ref === slotRef(before) ? slotRef(slot) : ref));
    onChange({ ...draft, slots, steps });
  }

  function changeStep(index: number, step: StepDraft) {
    const before = draft.steps[index];
    let steps = draft.steps.map((row, i) => (i === index ? step : row));
    if (before && before.key !== step.key) {
      steps = renameRefs(steps, (ref) => {
        const parsed = parseRef(ref);
        return parsed?.kind === "step" && parsed.key === before.key ? stepRef(step.key, parsed.output) : ref;
      });
    }
    onChange({ ...draft, steps });
  }

  function moveStep(index: number, offset: -1 | 1) {
    const steps = [...draft.steps];
    const [moved] = steps.splice(index, 1);
    if (!moved) return;
    steps.splice(index + offset, 0, moved);
    onChange({ ...draft, steps });
  }

  function addStep(name: string) {
    const algorithm = algorithms.find((candidate) => candidate.name === name);
    if (!algorithm) return;
    const step = stepForAlgorithm(algorithm, draft.steps.map((row) => row.key));
    // Declare the slots a first step reads, so a simple recipe needs no extra typing.
    const declared = new Set(draft.slots.map((row) => row.slot));
    const missing = Object.values(step.inputs)
      .map((ref) => parseRef(ref))
      .flatMap((ref) => (ref?.kind === "slot" && !declared.has(ref.slot) ? [ref.slot] : []));
    const slots = draft.steps.length ? draft.slots : [...draft.slots, ...missing.map((slot) => ({ id: draftId(), slot, defaultChannel: "" }))];
    onChange({ ...draft, slots, steps: [...draft.steps, step] });
    setAdding("");
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-body-medium text-text-primary">
            {formatMessage({ id: "feature.blueprint.editor.slots", defaultMessage: "Inputs" })}
          </h3>
          <p className="text-caption-1-regular text-text-tertiary">
            {formatMessage({
              id: "feature.blueprint.editor.slotsHint",
              defaultMessage:
                "Each device binds an input to one of its channels. A default channel binds itself when the device has it.",
            })}
          </p>
        </div>
        {draft.slots.length ? (
          <ul className="flex flex-col gap-3">
            {draft.slots.map((row, index) => (
              <li key={row.id} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <FormField
                  id={`slot-${row.id}`}
                  label={formatMessage({ id: "feature.blueprint.editor.slotName", defaultMessage: "Input name" })}
                >
                  <Input
                    id={`slot-${row.id}`}
                    value={row.slot}
                    autoComplete="off"
                    className="font-mono"
                    placeholder="temperature"
                    onChange={(event) => renameSlot(index, event.target.value)}
                  />
                </FormField>
                <FormField
                  id={`slot-default-${row.id}`}
                  label={formatMessage({ id: "feature.blueprint.editor.defaultChannel", defaultMessage: "Default channel" })}
                >
                  <Input
                    id={`slot-default-${row.id}`}
                    value={row.defaultChannel}
                    autoComplete="off"
                    className="font-mono"
                    placeholder="environment_metrics.temperature"
                    onChange={(event) =>
                      onChange({
                        ...draft,
                        slots: draft.slots.map((slot, i) => (i === index ? { ...slot, defaultChannel: event.target.value } : slot)),
                      })
                    }
                  />
                </FormField>
                <Button
                  type="button"
                  size="small"
                  variant="ghost"
                  iconOnly
                  leadingIcon={RiDeleteBinLine}
                  aria-label={formatMessage({ id: "feature.blueprint.editor.removeSlot", defaultMessage: "Remove input" })}
                  onClick={() => onChange({ ...draft, slots: draft.slots.filter((_, i) => i !== index) })}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <div>
          <Button
            type="button"
            size="xs"
            variant="secondary"
            leadingIcon={RiAddLine}
            onClick={() => onChange({ ...draft, slots: [...draft.slots, { id: draftId(), slot: "", defaultChannel: "" }] })}
          >
            {formatMessage({ id: "feature.blueprint.editor.addSlot", defaultMessage: "Add input" })}
          </Button>
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-body-medium text-text-primary">
            {formatMessage({ id: "feature.blueprint.editor.steps", defaultMessage: "Steps" })}
          </h3>
          <p className="text-caption-1-regular text-text-tertiary">
            {formatMessage({
              id: "feature.blueprint.editor.stepsHint",
              defaultMessage: "Run in order. A step reads inputs, or what an earlier step wrote.",
            })}
          </p>
        </div>
        {draft.steps.length ? (
          <ol className="flex flex-col gap-3">
            {draft.steps.map((step, index) => (
              <StepEditor
                key={step.id}
                draft={draft}
                index={index}
                algorithms={algorithms}
                onChange={(next) => changeStep(index, next)}
                onMove={(offset) => moveStep(index, offset)}
                onRemove={() => onChange({ ...draft, steps: draft.steps.filter((_, i) => i !== index) })}
              />
            ))}
          </ol>
        ) : null}
        <FormField
          id="blueprint-add-step"
          label={formatMessage({ id: "feature.blueprint.editor.addStep", defaultMessage: "Add a step" })}
        >
          <FormSelect
            id="blueprint-add-step"
            name="add_step"
            value={adding}
            placeholder={formatMessage({ id: "feature.blueprint.editor.addStepPlaceholder", defaultMessage: "Choose an algorithm" })}
            items={pointwise.map((algorithm) => ({ label: algorithm.name, value: algorithm.name }))}
            onValueChange={addStep}
          />
        </FormField>
      </section>
      {withNotes ? (
        <FormField
          id="blueprint-notes"
          label={formatMessage({ id: "feature.blueprint.editor.notes", defaultMessage: "What changed" })}
        >
          <Textarea
            id="blueprint-notes"
            value={draft.notes}
            onChange={(event) => onChange({ ...draft, notes: event.target.value })}
          />
        </FormField>
      ) : null}
    </div>
  );
}
