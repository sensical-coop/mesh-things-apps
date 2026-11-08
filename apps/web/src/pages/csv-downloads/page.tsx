import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { ListScaffold } from "@/components/list-scaffold";
import { CsvDownloadsFrame } from "@/features/export/ui/csv-downloads-frame";

export function CsvDownloadsPage(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <ListScaffold
      title={formatMessage({ id: "page.csvDownloads.title", defaultMessage: "CSV downloads" })}
      subtitle={formatMessage({
        id: "page.csvDownloads.description",
        defaultMessage: "Here you can download your data as CSV files.",
      })}
    >
      <CsvDownloadsFrame />
    </ListScaffold>
  );
}
