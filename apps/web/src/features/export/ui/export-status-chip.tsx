import type { Export } from "@mtt/contracts";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { StatusChip } from "@/components/status-chip";

export type ExportStatusChipProps = {
  status: Export["status"];
};

const TONE = { queued: "neutral", running: "blue", ready: "lime", failed: "rose", expired: "soft" } as const;

export function ExportStatusChip({ status }: ExportStatusChipProps): ReactElement {
  const { formatMessage } = useIntl();
  const label = {
    queued: formatMessage({ id: "feature.export.status.queued", defaultMessage: "Queued" }),
    running: formatMessage({ id: "feature.export.status.running", defaultMessage: "Preparing" }),
    ready: formatMessage({ id: "feature.export.status.ready", defaultMessage: "Ready" }),
    failed: formatMessage({ id: "feature.export.status.failed", defaultMessage: "Failed" }),
    expired: formatMessage({ id: "feature.export.status.expired", defaultMessage: "Expired" }),
  }[status];
  return <StatusChip tone={TONE[status]} label={label} />;
}
