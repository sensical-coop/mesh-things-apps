import type { BlueprintVersion } from "@mtt/contracts";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { derivedChannel, parseRef } from "@mtt/contracts/blueprint";
import { formatParams, stringMap, valueMap } from "@/lib/algorithm-params";

export type VersionSummaryProps = {
  version: Pick<BlueprintVersion, "inputs" | "steps">;
};

export function VersionSummary({ version }: VersionSummaryProps): ReactElement {
  const { formatMessage } = useIntl();
  const steps = [...version.steps].sort((a, b) => a.order - b.order);

  function refText(ref: string): string {
    const parsed = parseRef(ref);
    if (parsed?.kind === "slot") return parsed.slot;
    if (parsed?.kind === "step") return `${parsed.key}.${parsed.output}`;
    return ref;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className="text-caption-1-medium text-text-secondary">
          {formatMessage({ id: "feature.blueprint.summary.inputs", defaultMessage: "Inputs" })}
        </p>
        {version.inputs.length ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {version.inputs.map((input) => (
              <li key={input.slot} className="text-body-regular text-text-primary">
                <span className="font-mono">{input.slot}</span>
                {input.default_channel ? (
                  <span className="text-text-tertiary"> ← <span className="font-mono">{input.default_channel}</span></span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-regular text-text-tertiary">
            {formatMessage({ id: "feature.blueprint.summary.noInputs", defaultMessage: "None" })}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-caption-1-medium text-text-secondary">
          {formatMessage({ id: "feature.blueprint.summary.steps", defaultMessage: "Steps" })}
        </p>
        <ol className="flex flex-col gap-2">
          {steps.map((step, index) => {
            const inputs = Object.entries(stringMap(step.inputs));
            const params = formatParams(valueMap(step.params));
            const outputs = Object.values(stringMap(step.outputs));
            return (
              <li key={step.key} className="flex min-w-0 flex-col gap-0.5 text-body-regular text-text-primary">
                <p className="min-w-0 wrap-break-word">
                  <span className="text-text-tertiary tabular-nums">{index + 1}. </span>
                  <span className="font-mono">{step.key}</span>
                  <span className="text-text-tertiary"> · </span>
                  <span className="font-mono text-text-secondary">{step.function_name}</span>
                </p>
                <p className="min-w-0 pl-4 text-caption-1-regular wrap-break-word text-text-secondary">
                  {formatMessage(
                    { id: "feature.blueprint.summary.flow", defaultMessage: "Inputs: {inputs}. Outputs: {outputs}" },
                    {
                      inputs: inputs.map(([, ref]) => refText(ref)).join(", ") || "—",
                      outputs: outputs.map(derivedChannel).join(", ") || "—",
                    },
                  )}
                </p>
                {params ? (
                  <p className="min-w-0 pl-4 font-mono text-caption-1-regular wrap-break-word text-text-tertiary">
                    {params}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
