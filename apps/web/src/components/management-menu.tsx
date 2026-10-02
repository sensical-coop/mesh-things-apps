import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { NavMenu } from "@/components/nav-menu";
import { useSuperuserCounts } from "@/features/operator-request/use-superuser-counts";
import { routes } from "@/router";

export type ManagementMenuProps = {
  stacked?: boolean;
  onNavigate?: () => void;
  linkClass: string;
  activeClass: string;
};

/**
 * Superusers' pages: operator requests and scheduled deletions. The trigger counts
 * everything waiting; each item counts its own.
 */
export function ManagementMenu(props: ManagementMenuProps): ReactElement {
  const { formatMessage } = useIntl();
  const { pendingRequests, overdueDeletions } = useSuperuserCounts();
  return (
    <NavMenu
      {...props}
      title={formatMessage({ id: "console.header.management", defaultMessage: "Management" })}
      totalCountLabel={(total) =>
        formatMessage({ id: "console.header.managementCount", defaultMessage: "{count} need attention" }, { count: total })
      }
      items={[
        {
          to: routes.operatorRequests,
          label: formatMessage({ id: "console.header.management.operatorRequests", defaultMessage: "Operator requests" }),
          count: pendingRequests,
          countLabel: formatMessage(
            { id: "console.header.operatorRequestsCount", defaultMessage: "{count} waiting" },
            { count: pendingRequests },
          ),
        },
        {
          to: routes.dataDeletions,
          label: formatMessage({ id: "console.header.management.dataDeletions", defaultMessage: "Scheduled deletions" }),
          count: overdueDeletions,
          countLabel: formatMessage(
            { id: "console.header.dataDeletionsCount", defaultMessage: "{count} overdue" },
            { count: overdueDeletions },
          ),
        },
      ]}
    />
  );
}
