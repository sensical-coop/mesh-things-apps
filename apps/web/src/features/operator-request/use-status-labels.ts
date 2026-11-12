import type { OperatorRequest } from "@mtt/contracts";
import { useIntl } from "react-intl";

export function useOperatorRequestStatusLabels(): Record<OperatorRequest["status"], string> {
  const { formatMessage } = useIntl();
  return {
    pending: formatMessage({ id: "feature.operatorRequest.status.pending", defaultMessage: "Pending" }),
    approved: formatMessage({ id: "feature.operatorRequest.status.approved", defaultMessage: "Approved" }),
    rejected: formatMessage({ id: "feature.operatorRequest.status.rejected", defaultMessage: "Rejected" }),
  };
}
