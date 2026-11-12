import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { NavLink } from "@/components/nav-link";
import { NavMenu } from "@/components/nav-menu";
import { useMe } from "@/features/auth/use-me";
import { ManagementMenu } from "@/management-menu";
import { NAV_GROUPS, NAV_PAGES } from "@/nav-items";

export function NavLinks({
  onNavigate,
  stacked,
}: {
  onNavigate?: () => void;
  stacked?: boolean;
}): ReactElement {
  const { formatMessage } = useIntl();
  const { isOperator, isSuperuser } = useMe();

  return (
    <>
      {NAV_PAGES.map((page) => (
        <NavLink key={page.to} to={page.to} exact={page.exact} stacked={stacked} onNavigate={onNavigate}>
          {formatMessage(page.label)}
        </NavLink>
      ))}
      {NAV_GROUPS.map((group) => (
        <NavMenu
          key={group.title.id}
          title={formatMessage(group.title)}
          items={group.items
            .filter((item) => isOperator || !item.operatorOnly)
            .map((item) => ({
              to: item.to,
              label: formatMessage(item.label),
              description: item.description ? formatMessage(item.description) : undefined,
            }))}
          stacked={stacked}
          onNavigate={onNavigate}
        />
      ))}
      {isSuperuser ? <ManagementMenu stacked={stacked} onNavigate={onNavigate} /> : null}
    </>
  );
}
