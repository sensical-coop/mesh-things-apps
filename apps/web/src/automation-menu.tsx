import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { NavMenu } from "@/components/nav-menu";
import { routes } from "@/router";

export type AutomationMenuProps = {
  stacked?: boolean;
  onNavigate?: () => void;
  linkClass: string;
  activeClass: string;
};

export function AutomationMenu(props: AutomationMenuProps): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <NavMenu
      {...props}
      title={formatMessage({ id: "console.nav.automation", defaultMessage: "Automation" })}
      items={[
        {
          to: routes.alarms,
          label: formatMessage({ id: "console.nav.alarms", defaultMessage: "Alarms" }),
          description: formatMessage({
            id: "console.header.automation.alarmsDescription",
            defaultMessage: "Alarms for each measurement",
          }),
        },
        {
          to: routes.blueprints,
          label: formatMessage({ id: "console.nav.blueprints", defaultMessage: "Blueprints" }),
          description: formatMessage({
            id: "console.header.automation.blueprintsDescription",
            defaultMessage: "Computations on incoming readings",
          }),
        },
      ]}
    />
  );
}
