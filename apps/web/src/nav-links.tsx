import { cx } from "@mtt/ui/utils";
import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { AutomationMenu } from "@/components/automation-menu";
import { DataMenu } from "@/components/data-menu";
import { ManagementMenu } from "@/management-menu";
import { useMe } from "@/features/auth/use-me";
import { routes } from "@/router";

export const headerLinkClass =
  "rounded-full px-3 py-1 text-body-medium text-text-secondary outline-hidden hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring";

export function NavLinks({
  onNavigate,
  stacked,
}: {
  onNavigate?: () => void;
  stacked?: boolean;
}): ReactElement {
  const { formatMessage } = useIntl();
  const { isOperator, isSuperuser } = useMe();
  const linkClass = stacked ? cx(headerLinkClass, "block w-full px-3 py-2") : headerLinkClass;
  const activeClass = stacked
    ? cx(headerLinkClass, "block w-full bg-background-secondary-default px-3 py-2 text-text-primary")
    : cx(headerLinkClass, "bg-background-secondary-default text-text-primary");

  return (
    <>
      <Link
        to={routes.meshes}
        activeOptions={{ exact: true }}
        className={linkClass}
        activeProps={{ className: activeClass }}
        onClick={onNavigate}
      >
        {formatMessage({ id: "console.footer.meshes", defaultMessage: "Meshes" })}
      </Link>
      <Link
        to={routes.devices}
        className={linkClass}
        activeProps={{ className: activeClass }}
        onClick={onNavigate}
      >
        {formatMessage({ id: "console.footer.devices", defaultMessage: "Devices" })}
      </Link>
      <AutomationMenu stacked={stacked} onNavigate={onNavigate} linkClass={linkClass} activeClass={activeClass} />
      <DataMenu
        stacked={stacked}
        onNavigate={onNavigate}
        linkClass={linkClass}
        activeClass={activeClass}
        isOperator={isOperator}
      />
      {isSuperuser ? (
        <ManagementMenu
          stacked={stacked}
          onNavigate={onNavigate}
          linkClass={linkClass}
          activeClass={activeClass}
        />
      ) : null}
    </>
  );
}
