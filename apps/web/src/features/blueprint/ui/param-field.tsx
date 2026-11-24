import type { AlgorithmParam } from "@mtt/contracts";
import { Input } from "@mtt/ui/components/ui/input";
import { type ComponentProps, type ReactElement } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@mtt/ui/forms/form-field";
import { paramLabel } from "@/lib/algorithm-params";

export type ParamFieldProps = Omit<ComponentProps<typeof Input>, "id" | "placeholder"> & {
  id: string;
  param: AlgorithmParam;
};

/** One algorithm param as a labelled text field; the rest goes to the input. */
export function ParamField({ id, param, ...input }: ParamFieldProps): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <FormField id={id} label={paramLabel(param)} hint={param.doc || undefined}>
      <Input
        id={id}
        autoComplete="off"
        placeholder={
          param.required
            ? formatMessage({ id: "feature.blueprint.step.paramRequired", defaultMessage: "Required" })
            : formatMessage(
                { id: "feature.blueprint.step.paramDefault", defaultMessage: "Default {value}" },
                { value: JSON.stringify(param.default) },
              )
        }
        {...input}
      />
    </FormField>
  );
}
