import type { SinkRead } from "@mtt/contracts";
import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export type SinkStatusChipProps = {
  sink: Pick<SinkRead, "paused_at">;
};

/** Paused when its terms lapsed: nothing is sent and consumers are refused until renewed. */
export function SinkStatusChip({ sink }: SinkStatusChipProps): ReactElement {
  const { formatMessage } = useIntl();
  return sink.paused_at ? (
    <Chip variant="caption" color="yellow" className="rounded-full">
      {formatMessage({ id: "feature.sink.status.paused", defaultMessage: "Paused" })}
    </Chip>
  ) : (
    <Chip variant="caption" color="lime" className="rounded-full">
      {formatMessage({ id: "feature.sink.status.sending", defaultMessage: "Sending" })}
    </Chip>
  );
}
