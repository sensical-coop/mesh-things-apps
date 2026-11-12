import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@mtt/ui/components/ui/field";
import { type ReactElement, type ReactNode } from "react";

/** Element id of a field's error message, for `aria-describedby` on its control. */
export const fieldErrorId = (id: string): string => `${id}-error`;

/** Element id of a field's hint, for `aria-describedby` on its control. */
export const fieldHintId = (id: string): string => `${id}-hint`;

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
        <FieldDescription id={fieldHintId(id)} className="text-caption-1-regular text-text-tertiary">
          {hint}
        </FieldDescription>
      ) : null}
      {error ? <FieldError id={fieldErrorId(id)}>{error}</FieldError> : null}
    </Field>
  );
}
