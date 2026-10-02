import { Field, FieldLabel } from "@mtt/ui/components/ui/field";
import { Checkbox } from "@mtt/ui/components/ui/checkbox";
import { type ReactElement } from "react";

export function FormCheckbox({
  id,
  name,
  label,
  hint,
  defaultChecked,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}): ReactElement {
  const field = (
    <Field orientation="horizontal">
      <Checkbox id={id} name={name} defaultChecked={defaultChecked} />
      <FieldLabel htmlFor={id} className="text-body-regular text-text-primary">
        {label}
      </FieldLabel>
    </Field>
  );
  if (!hint) return field;
  return (
    <div className="flex flex-col gap-1">
      {field}
      <p className="pl-7 text-caption-1-regular text-text-tertiary">{hint}</p>
    </div>
  );
}
