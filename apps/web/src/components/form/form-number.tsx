import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@mtt/ui/components/reui/number-field";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

// No grouping: with it, Spanish reads "41.38" as 4138. Without it, either
// separator parses as the decimal mark. Intl also caps fractions at 3 by default.
const FORMAT: Intl.NumberFormatOptions = { useGrouping: false, maximumFractionDigits: 20 };

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
  const { locale } = useIntl();
  return (
    <NumberField
      id={id}
      locale={locale}
      format={FORMAT}
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
