import type { OperatorRequest } from "@mtt/contracts";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { StatusChip } from "@/components/status-chip";

export type OperatorRequestStatusChipProps = {
  status: OperatorRequest["status"];
};

const TONE = { pending: "yellow", approved: "lime", rejected: "neutral" } as const;

export function OperatorRequestStatusChip({ status }: OperatorRequestStatusChipProps): ReactElement {
  const { formatMessage } = useIntl();
  const label = {
    pending: formatMessage({ id: "feature.operatorRequest.status.pending", defaultMessage: "Pending" }),
    approved: formatMessage({ id: "feature.operatorRequest.status.approved", defaultMessage: "Approved" }),
    rejected: formatMessage({ id: "feature.operatorRequest.status.rejected", defaultMessage: "Rejected" }),
  }[status];
  return <StatusChip tone={TONE[status]} label={label} />;
}
