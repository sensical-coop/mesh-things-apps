import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { NavMenu } from "@/components/nav-menu";
import { routes } from "@/router";

export type DataMenuProps = {
  stacked?: boolean;
  onNavigate?: () => void;
  linkClass: string;
  activeClass: string;
};

/**
 * Operators' data beyond the dashboards: sources bring remote brokers in, sinks publish
 * readings for other services, and the archive keeps chosen devices' readings as files.
 */
export function DataMenu(props: DataMenuProps): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <NavMenu
      {...props}
      title={formatMessage({ id: "console.header.data", defaultMessage: "Data" })}
      items={[
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
