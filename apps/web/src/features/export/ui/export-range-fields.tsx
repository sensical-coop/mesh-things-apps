import { Input } from "@mtt/ui/components/ui/input";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { EXPORT_MAX_DAYS, daysInRange, rangeProblem, utcToday } from "@/features/export/model";

export type ExportRange = { start: string; stop: string };

export type ExportRangeFieldsProps = {
  idPrefix: string;
  value: ExportRange;
  onChange: (value: ExportRange) => void;
  /** A refusal from the API about the range, shown under it. */
  error?: string;
};

/** First and last day of a download, UTC, both included, with the day count and the limit. */
export function ExportRangeFields({ idPrefix, value, onChange, error }: ExportRangeFieldsProps): ReactElement {
  const { formatMessage } = useIntl();
  const problem = rangeProblem(value.start, value.stop);
  const today = utcToday();
  const hint =
    problem === "reversed"
      ? formatMessage({ id: "feature.export.range.reversed", defaultMessage: "The last day comes before the first." })
      : problem === "tooLong"
        ? formatMessage(
            {
              id: "feature.export.range.tooLong",
              defaultMessage: "{count} days selected. A download covers at most {max} days.",
            },
            { count: daysInRange(value.start, value.stop), max: EXPORT_MAX_DAYS },
          )
        : problem === null
          ? formatMessage(
              {
                id: "feature.export.range.count",
                defaultMessage: "{count, plural, one {# day} other {# days}} (UTC), up to {max}.",
              },
              { count: daysInRange(value.start, value.stop), max: EXPORT_MAX_DAYS },
            )
          : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id={`${idPrefix}-start`} label={formatMessage({ id: "feature.export.range.start", defaultMessage: "First day" })}>
          <Input
            id={`${idPrefix}-start`}
            type="date"
            required
            max={today}
            value={value.start}
            onChange={(event) => onChange({ ...value, start: event.target.value })}
          />
        </FormField>
        <FormField id={`${idPrefix}-stop`} label={formatMessage({ id: "feature.export.range.stop", defaultMessage: "Last day" })}>
          <Input
            id={`${idPrefix}-stop`}
            type="date"
            required
            max={today}
            value={value.stop}
            onChange={(event) => onChange({ ...value, stop: event.target.value })}
          />
        </FormField>
      </div>
      {error ? (
        <p className="text-caption-1-regular text-text-error-primary" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p
          className={
            problem ? "text-caption-1-regular text-text-error-primary" : "text-caption-1-regular text-text-tertiary"
          }
          role={problem ? "alert" : undefined}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
