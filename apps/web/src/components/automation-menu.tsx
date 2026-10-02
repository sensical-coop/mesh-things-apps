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

/** What runs on each reading as it arrives: alarm detectors and blueprints. */
export function AutomationMenu(props: AutomationMenuProps): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <NavMenu
      {...props}
      title={formatMessage({ id: "console.header.automation", defaultMessage: "Automation" })}
      items={[
        {
          to: routes.alarms,
          label: formatMessage({ id: "console.footer.alarms", defaultMessage: "Alarms" }),
          description: formatMessage({
            id: "console.header.automation.alarmsDescription",
            defaultMessage: "Alarms for each measurement",
          }),
        },
        {
          to: routes.blueprints,
          label: formatMessage({ id: "console.footer.blueprints", defaultMessage: "Blueprints" }),
          description: formatMessage({
            id: "console.header.automation.blueprintsDescription",
            defaultMessage: "Computations on incoming readings",
          }),
        },
      ]}
    />
  );
}
