import type { DataDeletion } from "@mtt/contracts";
import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export type DataDeletionStatusChipProps = {
  status: DataDeletion["status"];
  overdue: boolean;
};

export function DataDeletionStatusChip({ status, overdue }: DataDeletionStatusChipProps): ReactElement {
  const { formatMessage } = useIntl();
  const shown = overdue
    ? {
        color: "rose" as const,
        label: formatMessage({ id: "feature.dataDeletion.status.overdue", defaultMessage: "Overdue" }),
      }
    : ({
        pending: {
          color: "yellow",
          label: formatMessage({ id: "feature.dataDeletion.status.pending", defaultMessage: "Scheduled" }),
        },
        done: { color: "lime", label: formatMessage({ id: "feature.dataDeletion.status.done", defaultMessage: "Deleted" }) },
        cancelled: {
          color: "neutral",
          label: formatMessage({ id: "feature.dataDeletion.status.cancelled", defaultMessage: "Cancelled" }),
        },
      } as const)[status];
  return (
    <Chip variant="caption" color={shown.color} className="rounded-full">
      {shown.label}
    </Chip>
  );
}
