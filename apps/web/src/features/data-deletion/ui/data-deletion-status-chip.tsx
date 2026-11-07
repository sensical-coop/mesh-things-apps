import type { DataDeletion } from "@mtt/contracts";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { StatusChip } from "@/components/status-chip";

export type DataDeletionStatusChipProps = {
  status: DataDeletion["status"];
  overdue: boolean;
};

export function DataDeletionStatusChip({ status, overdue }: DataDeletionStatusChipProps): ReactElement {
  const { formatMessage } = useIntl();
  if (overdue) {
    return <StatusChip tone="rose" label={formatMessage({ id: "feature.dataDeletion.status.overdue", defaultMessage: "Overdue" })} />;
  }
  const shown = {
    pending: {
      tone: "yellow",
      label: formatMessage({ id: "feature.dataDeletion.status.pending", defaultMessage: "Scheduled" }),
    },
    done: { tone: "lime", label: formatMessage({ id: "feature.dataDeletion.status.done", defaultMessage: "Deleted" }) },
    cancelled: {
      tone: "neutral",
      label: formatMessage({ id: "feature.dataDeletion.status.cancelled", defaultMessage: "Cancelled" }),
    },
  } as const;
  return <StatusChip tone={shown[status].tone} label={shown[status].label} />;
}
