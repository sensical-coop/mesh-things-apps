import type { DataDeletion } from "@mtt/contracts";
import { useIntl } from "react-intl";

export function useDataDeletionStatusLabels(): Record<DataDeletion["status"], string> {
  const { formatMessage } = useIntl();
  return {
    pending: formatMessage({ id: "feature.dataDeletion.status.pending", defaultMessage: "Scheduled" }),
    done: formatMessage({ id: "feature.dataDeletion.status.done", defaultMessage: "Deleted" }),
    cancelled: formatMessage({ id: "feature.dataDeletion.status.cancelled", defaultMessage: "Cancelled" }),
  };
}
