import type { Algorithm } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { Input } from "@mtt/ui/components/ui/input";
import { RiArrowDownLine, RiArrowUpLine, RiDeleteBinLine } from "@remixicon/react";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { FormSelect } from "@/components/form/form-select";
import {
  calibrationParams,
  configParams,
  refChoices,
  type BlueprintDraft,
  type StepDraft,
} from "@/features/blueprint/model";

export type StepEditorProps = {
  draft: BlueprintDraft;
  index: number;
  algorithms: readonly Algorithm[];
  onChange: (step: StepDraft) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
};

/** One step: its key, what feeds each algorithm input, its configuration, and the derived fields it writes. */
export function StepEditor({ draft, index, algorithms, onChange, onMove, onRemove }: StepEditorProps): ReactElement {
  const { formatMessage } = useIntl();
  const step = draft.steps[index];
  if (!step) throw new Error(`No step ${index}`);
  const algorithm = algorithms.find((candidate) => candidate.name === step.functionName);
  const choices = refChoices(draft, index).map((choice) => ({
    value: choice.value,
    label: choice.slot
      ? formatMessage({ id: "feature.blueprint.step.refSlot", defaultMessage: "Input {slot}" }, { slot: choice.slot })
      : formatMessage(
          { id: "feature.blueprint.step.refStep", defaultMessage: "Step {step} → {output}" },
          { step: choice.step, output: choice.output },
        ),
  }));
  const id = `step-${step.id}`;
  const perDevice = calibrationParams(algorithm);

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-separator-border p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-caption-1-medium text-text-tertiary">
            {formatMessage({ id: "feature.blueprint.step.number", defaultMessage: "Step {n}" }, { n: index + 1 })}
          </p>
          <p className="truncate font-mono text-body-medium text-text-primary">{step.functionName}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            iconOnly
            leadingIcon={RiArrowUpLine}
            disabled={index === 0}
            aria-label={formatMessage({ id: "feature.blueprint.step.moveUp", defaultMessage: "Move step up" })}
            onClick={() => onMove(-1)}
          />
          <Button
            type="button"
            size="xs"
            variant="ghost"
            iconOnly
            leadingIcon={RiArrowDownLine}
            disabled={index === draft.steps.length - 1}
            aria-label={formatMessage({ id: "feature.blueprint.step.moveDown", defaultMessage: "Move step down" })}
            onClick={() => onMove(1)}
          />
          <Button
            type="button"
            size="xs"
            variant="ghost"
            iconOnly
            leadingIcon={RiDeleteBinLine}
            aria-label={formatMessage({ id: "feature.blueprint.step.remove", defaultMessage: "Remove step" })}
            onClick={onRemove}
          />
        </div>
      </div>
      {algorithm?.doc ? (
        <p className="line-clamp-3 whitespace-pre-line text-caption-1-regular text-text-tertiary">{algorithm.doc.trim()}</p>
      ) : null}
      <FormField
        id={`${id}-key`}
        label={formatMessage({ id: "feature.blueprint.step.key", defaultMessage: "Step name" })}
        hint={formatMessage({
          id: "feature.blueprint.step.keyHint",
          defaultMessage: "Later steps and device calibrations refer to this step name. Keep it consistent across versions to keep calibrations.",
        })}
      >
        <Input
          id={`${id}-key`}
          value={step.key}
          autoComplete="off"
          className="font-mono"
          onChange={(event) => onChange({ ...step, key: event.target.value })}
        />
      </FormField>
      {algorithm?.inputs.length ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-caption-1-medium text-text-secondary">
            {formatMessage({ id: "feature.blueprint.step.inputs", defaultMessage: "Inputs" })}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {algorithm.inputs.map((input) => (
              <FormField key={input} id={`${id}-in-${input}`} label={input}>
                <FormSelect
                  id={`${id}-in-${input}`}
                  name={`${id}-in-${input}`}
                  items={choices}
                  value={choices.some((choice) => choice.value === step.inputs[input]) ? step.inputs[input] : ""}
                  placeholder={formatMessage({ id: "feature.blueprint.step.inputPlaceholder", defaultMessage: "Choose" })}
                  onValueChange={(value) => onChange({ ...step, inputs: { ...step.inputs, [input]: value } })}
                />
              </FormField>
            ))}
          </div>
        </fieldset>
      ) : null}
      {configParams(algorithm).length ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-caption-1-medium text-text-secondary">
            {formatMessage({ id: "feature.blueprint.step.params", defaultMessage: "Configuration" })}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {configParams(algorithm).map((param) => (
              <FormField
                key={param.name}
                id={`${id}-param-${param.name}`}
                label={param.unit ? `${param.name} (${param.unit})` : param.name}
                hint={param.doc || undefined}
              >
                <Input
                  id={`${id}-param-${param.name}`}
                  value={step.params[param.name] ?? ""}
                  autoComplete="off"
                  inputMode="decimal"
                  placeholder={
                    param.required
                      ? formatMessage({ id: "feature.blueprint.step.paramRequired", defaultMessage: "Required" })
                      : formatMessage(
                          { id: "feature.blueprint.step.paramDefault", defaultMessage: "Default {value}" },
                          { value: JSON.stringify(param.default) },
                        )
                  }
                  onChange={(event) => onChange({ ...step, params: { ...step.params, [param.name]: event.target.value } })}
                />
              </FormField>
            ))}
          </div>
        </fieldset>
      ) : null}
      {perDevice.length ? (
        <p className="text-caption-1-regular text-text-tertiary">
          {formatMessage(
            {
              id: "feature.blueprint.step.calibrationNote",
              defaultMessage: "Set on each device, as its calibration: {params}.",
            },
            { params: perDevice.map((param) => param.name).join(", ") },
          )}
        </p>
      ) : null}
      {algorithm?.outputs.length ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-caption-1-medium text-text-secondary">
            {formatMessage({ id: "feature.blueprint.step.outputs", defaultMessage: "Outputs" })}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {algorithm.outputs.map((output) => (
              <FormField
                key={output}
                id={`${id}-out-${output}`}
                label={output}
                hint={formatMessage(
                  { id: "feature.blueprint.step.outputHint", defaultMessage: "Stored as derived.{field}. Leave blank to skip." },
                  { field: step.outputs[output] || "…" },
                )}
              >
                <Input
                  id={`${id}-out-${output}`}
                  value={step.outputs[output] ?? ""}
                  autoComplete="off"
                  className="font-mono"
                  onChange={(event) => onChange({ ...step, outputs: { ...step.outputs, [output]: event.target.value } })}
                />
              </FormField>
            ))}
          </div>
        </fieldset>
      ) : null}
    </li>
  );
}
