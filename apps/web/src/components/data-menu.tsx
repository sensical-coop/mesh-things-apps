import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { NavMenu } from "@/components/nav-menu";
import { routes } from "@/router";

export type DataMenuProps = {
  stacked?: boolean;
  onNavigate?: () => void;
  linkClass: string;
  activeClass: string;
  /** Sources, sinks and the archive are for operators; CSV downloads are for everyone. */
  isOperator: boolean;
};

/**
 * Data beyond the dashboards: CSV downloads for everyone, and for operators sources that
 * bring remote brokers in, sinks that publish readings, and the archive of chosen devices.
 */
export function DataMenu({ isOperator, ...props }: DataMenuProps): ReactElement {
  const { formatMessage } = useIntl();
  const csvDownloads = {
    to: routes.csvDownloads,
    label: formatMessage({ id: "console.header.data.csvDownloads", defaultMessage: "CSV downloads" }),
    description: formatMessage({
      id: "console.header.data.csvDownloadsDescription",
      defaultMessage: "Your meshes' readings as CSV files",
    }),
  };
  if (!isOperator) {
    return (
      <NavMenu {...props} title={formatMessage({ id: "console.header.data", defaultMessage: "Data" })} items={[csvDownloads]} />
    );
  }
  return (
    <NavMenu
      {...props}
      title={formatMessage({ id: "console.header.data", defaultMessage: "Data" })}
      items={[
        csvDownloads,
        {
          to: routes.sources,
          label: formatMessage({ id: "console.footer.sources", defaultMessage: "Sources" }),
          description: formatMessage({
            id: "console.header.data.sourcesDescription",
            defaultMessage: "Remote MQTT brokers bridged into this instance",
          }),
        },
        {
          to: routes.sinks,
          label: formatMessage({ id: "console.header.data.sinks", defaultMessage: "Sinks" }),
          description: formatMessage({
            id: "console.header.data.sinksDescription",
            defaultMessage: "Readings published via MQTT",
          }),
        },
        {
          to: routes.archive,
          label: formatMessage({ id: "console.header.data.archive", defaultMessage: "Archive" }),
          description: formatMessage({
            id: "console.header.data.archiveDescription",
            defaultMessage: "Parquet files of the devices you store in S3",
          }),
        },
      ]}
    />
  );
}
