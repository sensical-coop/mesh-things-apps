import type { Export } from "@mtt/contracts";
import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export type ExportStatusChipProps = {
  status: Export["status"];
};

const COLOR = { queued: "neutral", running: "blue", ready: "lime", failed: "rose", expired: "soft" } as const;

export function ExportStatusChip({ status }: ExportStatusChipProps): ReactElement {
  const { formatMessage } = useIntl();
  const label = {
    queued: formatMessage({ id: "feature.export.status.queued", defaultMessage: "Queued" }),
    running: formatMessage({ id: "feature.export.status.running", defaultMessage: "Preparing" }),
    ready: formatMessage({ id: "feature.export.status.ready", defaultMessage: "Ready" }),
    failed: formatMessage({ id: "feature.export.status.failed", defaultMessage: "Failed" }),
    expired: formatMessage({ id: "feature.export.status.expired", defaultMessage: "Expired" }),
  }[status];
  return (
    <Chip variant="caption" color={COLOR[status]} className="rounded-full">
      {label}
    </Chip>
  );
}
