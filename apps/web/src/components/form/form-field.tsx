import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@mtt/ui/components/ui/field";
import { type ReactElement, type ReactNode } from "react";

export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}): ReactElement {
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
