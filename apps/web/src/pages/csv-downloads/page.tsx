import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { pageHeadingClass } from "@/lib/page-heading";
import { CsvDownloadsFrame } from "@/features/export/ui/csv-downloads-frame";

export function CsvDownloadsPage(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <>
      <div className={pageHeadingClass}>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.csvDownloads.title", defaultMessage: "CSV downloads" })}
          </h1>
          <p className="max-w-2xl text-body-regular text-text-secondary">
            {formatMessage({
              id: "page.csvDownloads.description",
              defaultMessage: "Here you can download your data as CSV files.",
            })}
          </p>
        </div>
      </div>
      <CsvDownloadsFrame />
    </>
  );
}
