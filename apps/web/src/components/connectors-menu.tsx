import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { NavMenu } from "@/components/nav-menu";
import { routes } from "@/router";

export type ConnectorsMenuProps = {
  stacked?: boolean;
  onNavigate?: () => void;
  linkClass: string;
  activeClass: string;
};

/**
 * How data crosses this instance's edge. Sources bring remote brokers in; sinks, which
 * forward data on to other instances, will join them here.
 */
export function ConnectorsMenu(props: ConnectorsMenuProps): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <NavMenu
      {...props}
      title={formatMessage({ id: "console.header.connectors", defaultMessage: "Connectors" })}
      items={[
        {
          to: routes.sources,
          label: formatMessage({ id: "console.footer.sources", defaultMessage: "Sources" }),
          description: formatMessage({
            id: "console.header.connectors.sourcesDescription",
            defaultMessage: "Remote brokers bridged into this instance",
          }),
        },
      ]}
    />
  );
}
