import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { NavMenu, type NavMenuItem } from "@/components/nav-menu";
import { routes } from "@/router";

export type DataMenuProps = {
  stacked?: boolean;
  onNavigate?: () => void;
  linkClass: string;
  activeClass: string;
  /** Sources, sinks and the archive are for operators; CSV downloads are for everyone. */
  isOperator: boolean;
};

export function DataMenu({ isOperator, ...props }: DataMenuProps): ReactElement {
  const { formatMessage } = useIntl();
  const items: (NavMenuItem & { operatorOnly?: boolean })[] = [
    {
      to: routes.csvDownloads,
      label: formatMessage({ id: "console.nav.csvDownloads", defaultMessage: "CSV downloads" }),
      description: formatMessage({
        id: "console.header.data.csvDownloadsDescription",
        defaultMessage: "Download meshes' data as CSV files",
      }),
    },
    {
      to: routes.archive,
      operatorOnly: true,
      label: formatMessage({ id: "console.nav.archive", defaultMessage: "Archive" }),
      description: formatMessage({
        id: "console.header.data.archiveDescription",
        defaultMessage: "Parquet files of the devices you store in S3",
      }),
    },
    {
      to: routes.sources,
      operatorOnly: true,
      label: formatMessage({ id: "console.nav.sources", defaultMessage: "Sources" }),
      description: formatMessage({
        id: "console.header.data.sourcesDescription",
        defaultMessage: "Remote MQTT brokers bridged into this instance",
      }),
    },
    {
      to: routes.sinks,
      operatorOnly: true,
      label: formatMessage({ id: "console.nav.sinks", defaultMessage: "Sinks" }),
      description: formatMessage({
        id: "console.header.data.sinksDescription",
        defaultMessage: "Readings published via MQTT",
      }),
    },
  ];
  return (
    <NavMenu
      {...props}
      title={formatMessage({ id: "console.nav.data", defaultMessage: "Data" })}
      items={items.filter((item) => isOperator || !item.operatorOnly)}
    />
  );
}
