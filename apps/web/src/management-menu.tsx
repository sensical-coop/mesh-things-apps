import { useQuery } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { NavMenu } from "@/components/nav-menu";
import { useMe } from "@/features/auth/use-me";
import { isOverdue } from "@/features/data-deletion/model";
import { dataDeletionRepository } from "@/features/data-deletion/repository";
import { operatorRequestRepository } from "@/features/operator-request/repository";
import { routes } from "@/router";

/** Operator requests to decide, and deletions past their date. Zero for everyone else. */
function useSuperuserCounts(): { pendingRequests: number; overdueDeletions: number } {
  const { isSuperuser } = useMe();
  const requests = useQuery({
    ...operatorRequestRepository.list({ status: "pending" }),
    enabled: isSuperuser,
  });
  const deletions = useQuery({
    ...dataDeletionRepository.list({ status: "pending" }),
    enabled: isSuperuser,
  });
  const now = new Date();
  return {
    pendingRequests: requests.data?.length ?? 0,
    overdueDeletions: (deletions.data ?? []).filter((row) => isOverdue(row, now)).length,
  };
}

export type ManagementMenuProps = {
  stacked?: boolean;
  onNavigate?: () => void;
  linkClass: string;
  activeClass: string;
};

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
