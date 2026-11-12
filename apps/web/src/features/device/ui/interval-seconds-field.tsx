import { FormField } from "@mtt/ui/forms/form-field";
import { FormNumber } from "@mtt/ui/forms/form-number";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { useFormatters } from "@/hooks/use-formatters";

type IntervalSecondsFieldProps = {
  id: string;
  name: string;
  label: string;
  hint: string;
  defaultValue: number | null;
  error?: string;
};

export function IntervalSecondsField({ id, name, label, hint, defaultValue, error }: IntervalSecondsFieldProps): ReactElement {
  const { locale } = useIntl();
  const { formatSecondsAsHms } = useFormatters();
  const [seconds, setSeconds] = useState(defaultValue);
  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <FormNumber locale={locale} id={id} name={name} min={0} defaultValue={defaultValue ?? undefined} onValueChange={setSeconds} />
        </div>
        <p className="shrink-0 text-caption-1-regular whitespace-nowrap text-text-tertiary tabular-nums" aria-live="polite">
          {formatSecondsAsHms(seconds)}
        </p>
      </div>
    </FormField>
  );
}
