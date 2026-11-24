import type { OperatorRequest } from "@mtt/contracts";
import { type ReactElement } from "react";
import { StatusChip } from "@/components/status-chip";
import { useOperatorRequestStatusLabels } from "@/features/operator-request/use-status-labels";

export type OperatorRequestStatusChipProps = {
  status: OperatorRequest["status"];
};

const TONE = { pending: "yellow", approved: "lime", rejected: "neutral" } as const;

export function OperatorRequestStatusChip({ status }: OperatorRequestStatusChipProps): ReactElement {
  const labels = useOperatorRequestStatusLabels();
  return <StatusChip tone={TONE[status]} label={labels[status]} />;
}
