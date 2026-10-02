import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export type SourceStatusChipProps = {
  /** The bridge's status as the API reports it: connected, disconnected, paused, or unknown. */
  status: string;
};

export function SourceStatusChip({ status }: SourceStatusChipProps): ReactElement {
  const { formatMessage } = useIntl();
  const known = {
    connected: {
      color: "lime",
      label: formatMessage({ id: "feature.source.status.connected", defaultMessage: "Connected" }),
    },
    disconnected: {
      color: "rose",
      label: formatMessage({ id: "feature.source.status.disconnected", defaultMessage: "Disconnected" }),
    },
    paused: {
      color: "yellow",
      label: formatMessage({ id: "feature.source.status.paused", defaultMessage: "Paused" }),
    },
  } as const;
  const shown =
    status === "connected" || status === "disconnected" || status === "paused"
      ? known[status]
      : {
          color: "neutral" as const,
          label: formatMessage({ id: "feature.source.status.unknown", defaultMessage: "Unknown" }),
        };
  return (
    <Chip variant="caption" color={shown.color} className="rounded-full">
      {shown.label}
    </Chip>
  );
}
