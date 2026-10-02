import type { OperatorRequest } from "@mtt/contracts";
import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export type OperatorRequestStatusChipProps = {
  status: OperatorRequest["status"];
};

export function OperatorRequestStatusChip({ status }: OperatorRequestStatusChipProps): ReactElement {
  const { formatMessage } = useIntl();
  const labels = {
    pending: formatMessage({ id: "feature.operatorRequest.status.pending", defaultMessage: "Pending" }),
    approved: formatMessage({ id: "feature.operatorRequest.status.approved", defaultMessage: "Approved" }),
    rejected: formatMessage({ id: "feature.operatorRequest.status.rejected", defaultMessage: "Rejected" }),
  };
  const colors = { pending: "yellow", approved: "lime", rejected: "neutral" } as const;
  return (
    <Chip variant="caption" color={colors[status]} className="rounded-full">
      {labels[status]}
    </Chip>
  );
}
