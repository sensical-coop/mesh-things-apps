import type { SinkRead } from "@mtt/contracts";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { StatusChip } from "@/components/status-chip";

export type SinkStatusChipProps = {
  sink: Pick<SinkRead, "paused_at">;
};

/** Paused when its terms lapsed: nothing is sent and consumers are refused until renewed. */
export function SinkStatusChip({ sink }: SinkStatusChipProps): ReactElement {
  const { formatMessage } = useIntl();
  return sink.paused_at ? (
    <StatusChip tone="yellow" label={formatMessage({ id: "feature.sink.status.paused", defaultMessage: "Paused" })} />
  ) : (
    <StatusChip tone="lime" label={formatMessage({ id: "feature.sink.status.sending", defaultMessage: "Sending" })} />
  );
}
