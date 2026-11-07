import type { DevicePostprocessing } from "@mtt/contracts";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { StatusChip } from "@/components/status-chip";

export type PostprocessingStateChipProps = {
  postprocessing: Pick<DevicePostprocessing, "is_enabled" | "problems">;
};

export function PostprocessingStateChip({ postprocessing }: PostprocessingStateChipProps): ReactElement {
  const { formatMessage } = useIntl();
  if (postprocessing.is_enabled) {
    return (
      <StatusChip tone="lime" label={formatMessage({ id: "feature.postprocessing.state.running", defaultMessage: "Running" })} />
    );
  }
  return postprocessing.problems.length ? (
    <StatusChip
      tone="yellow"
      label={formatMessage({ id: "feature.postprocessing.state.incomplete", defaultMessage: "Needs setup" })}
    />
  ) : (
    <StatusChip tone="neutral" label={formatMessage({ id: "feature.postprocessing.state.stopped", defaultMessage: "Stopped" })} />
  );
}
