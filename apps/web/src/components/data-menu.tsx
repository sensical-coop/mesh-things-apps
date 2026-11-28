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
 * Data beyond the dashboards: CSV downloads for everyone, and for operators the archive of
 * chosen devices, sources that bring remote brokers in, and sinks that publish readings.
 */
export function DataMenu({ isOperator, ...props }: DataMenuProps): ReactElement {
  const { formatMessage } = useIntl();
  const csvDownloads = {
    to: routes.csvDownloads,
    label: formatMessage({ id: "console.header.data.csvDownloads", defaultMessage: "CSV downloads" }),
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
          to: routes.archive,
          label: formatMessage({ id: "console.header.data.archive", defaultMessage: "Archive" }),
        },
        {
          to: routes.sources,
          label: formatMessage({ id: "console.footer.sources", defaultMessage: "Sources" }),
        },
        {
          to: routes.sinks,
          label: formatMessage({ id: "console.header.data.sinks", defaultMessage: "Sinks" }),
        },
      ]}
    />
  );
}
