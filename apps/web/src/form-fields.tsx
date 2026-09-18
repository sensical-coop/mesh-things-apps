import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/reui/number-field";
import { type ReactElement, type ReactNode } from "react";

export { Input };

export type SelectItemOption = { label: string; value: string };

type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function FormField({ id, label, hint, error, children }: FormFieldProps): ReactElement {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id} className="text-caption-1-medium text-text-secondary">
        {label}
      </FieldLabel>
      {children}
      {hint ? (
        <FieldDescription className="text-caption-1-regular text-text-tertiary">{hint}</FieldDescription>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

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

export function FormSelect({
  id,
  name,
  items,
  defaultValue,
  placeholder,
  required,
}: {
  id: string;
  name: string;
  items: readonly SelectItemOption[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}): ReactElement {
  return (
    <Select name={name} defaultValue={defaultValue} items={[...items]} required={required}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function FormNumber({
  id,
  name,
  defaultValue,
  min,
  max,
  step,
  required,
  onValueChange,
}: {
  id: string;
  name: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number | "any";
  required?: boolean;
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
