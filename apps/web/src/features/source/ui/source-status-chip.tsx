import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { StatusChip } from "@/components/status-chip";
import { sourceStatus, type SourceStatus } from "@/features/source/model";

export type SourceStatusChipProps = {
  status: string;
};

const TONE = { connected: "lime", disconnected: "rose", paused: "yellow" } as const;

export function SourceStatusChip({ status }: SourceStatusChipProps): ReactElement {
  const { formatMessage } = useIntl();
  const known = sourceStatus(status);
  const label: Record<SourceStatus, string> = {
    connected: formatMessage({ id: "feature.source.status.connected", defaultMessage: "Connected" }),
    disconnected: formatMessage({ id: "feature.source.status.disconnected", defaultMessage: "Disconnected" }),
    paused: formatMessage({ id: "feature.source.status.paused", defaultMessage: "Paused" }),
  };
  return known ? (
    <StatusChip tone={TONE[known]} label={label[known]} />
  ) : (
    <StatusChip tone="neutral" label={formatMessage({ id: "feature.source.status.unknown", defaultMessage: "Unknown" })} />
  );
}
