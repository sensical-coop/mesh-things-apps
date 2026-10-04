import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export type ExportHistoryHeadingProps = {
  /** What the list's buttons do on this page. */
  description: string;
};

/** Heads the past downloads under a download form, set off from the form by a rule. */
export function ExportHistoryHeading({ description }: ExportHistoryHeadingProps): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <div className="flex flex-col gap-1 border-t border-separator-border pt-6">
      <h2 className="text-body-medium text-text-primary">
        {formatMessage({ id: "feature.export.history.title", defaultMessage: "History of downloads" })}
      </h2>
      <p className="max-w-2xl text-body-regular text-text-secondary">{description}</p>
    </div>
  );
}
