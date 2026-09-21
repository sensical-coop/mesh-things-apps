import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@mtt/ui/components/reui/number-field";
import { type ReactElement } from "react";

export function FormNumber({
  id,
  name,
  defaultValue,
  min,
  max,
  step,
  required,
  disabled,
  onValueChange,
}: {
  id: string;
  name: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number | "any";
  required?: boolean;
  disabled?: boolean;
  onValueChange?: (value: number | null) => void;
}): ReactElement {
  return (
    <NumberField
      id={id}
      name={name}
      defaultValue={defaultValue}
      min={min}
      max={max}
      step={step}
      required={required}
      disabled={disabled}
      onValueChange={onValueChange}
    >
      <NumberFieldGroup>
        <NumberFieldInput className="text-left" />
        <NumberFieldDecrement className="rounded-none!" />
        <NumberFieldIncrement />
      </NumberFieldGroup>
    </NumberField>
  );
}
