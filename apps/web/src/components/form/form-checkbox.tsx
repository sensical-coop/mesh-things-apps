import { Field, FieldLabel } from "@mtt/ui/components/ui/field";
import { Checkbox } from "@mtt/ui/components/ui/checkbox";
import { type ReactElement } from "react";

export function FormCheckbox({
  id,
  name,
  label,
  defaultChecked,
}: {
  id: string;
  name: string;
  label: string;
  defaultChecked?: boolean;
}): ReactElement {
  return (
    <Field orientation="horizontal">
      <Checkbox id={id} name={name} defaultChecked={defaultChecked} />
      <FieldLabel htmlFor={id} className="text-body-regular text-text-primary">
        {label}
      </FieldLabel>
    </Field>
  );
}
