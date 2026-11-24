import type { DataDeletion } from "@mtt/contracts";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { StatusChip } from "@/components/status-chip";
import { useDataDeletionStatusLabels } from "@/features/data-deletion/use-status-labels";

const TONE = { pending: "yellow", done: "lime", cancelled: "neutral" } as const;

export type DataDeletionStatusChipProps = {
  status: DataDeletion["status"];
  overdue: boolean;
};

export function DataDeletionStatusChip({ status, overdue }: DataDeletionStatusChipProps): ReactElement {
  const { formatMessage } = useIntl();
  const labels = useDataDeletionStatusLabels();
  if (overdue) {
    return <StatusChip tone="rose" label={formatMessage({ id: "feature.dataDeletion.status.overdue", defaultMessage: "Overdue" })} />;
  }
  return <StatusChip tone={TONE[status]} label={labels[status]} />;
}
