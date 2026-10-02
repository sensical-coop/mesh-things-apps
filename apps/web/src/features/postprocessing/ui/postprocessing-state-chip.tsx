import type { DevicePostprocessing } from "@mtt/contracts";
import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";

export type PostprocessingStateChipProps = {
  postprocessing: Pick<DevicePostprocessing, "is_enabled" | "problems">;
};

/** Running, stopped, or stopped because something is missing. */
export function PostprocessingStateChip({ postprocessing }: PostprocessingStateChipProps): ReactElement {
  const { formatMessage } = useIntl();
  if (postprocessing.is_enabled) {
    return (
      <Chip variant="caption" color="lime" className="rounded-full">
        {formatMessage({ id: "feature.postprocessing.state.running", defaultMessage: "Running" })}
      </Chip>
    );
  }
  return postprocessing.problems.length ? (
    <Chip variant="caption" color="yellow" className="rounded-full">
      {formatMessage({ id: "feature.postprocessing.state.incomplete", defaultMessage: "Needs setup" })}
    </Chip>
  ) : (
    <Chip variant="caption" color="neutral" className="rounded-full">
      {formatMessage({ id: "feature.postprocessing.state.stopped", defaultMessage: "Stopped" })}
    </Chip>
  );
}
