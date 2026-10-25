import type { Algorithm, DeviceMeasurement, DevicePostprocessing } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { RiDeleteBinLine } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { errorMessages } from "@/features/blueprint/model";
import { blueprintRepository } from "@/features/blueprint/repository";
import { calibratedSteps, channelLabel } from "@/features/postprocessing/model";
import { postprocessingRepository } from "@/features/postprocessing/repository";
import { PostprocessingStateChip } from "@/features/postprocessing/ui/postprocessing-state-chip";
import { StartRefusedDialog } from "@/features/postprocessing/ui/start-refused-dialog";
import { routes } from "@/router";

export type PostprocessingItemProps = {
  deviceUuid: string;
  postprocessing: DevicePostprocessing;
  measurements: readonly DeviceMeasurement[];
  algorithms: readonly Algorithm[];
  /** The blueprint's newest version number, when the caller can see the blueprint. */
  latestVersion: number | undefined;
  canEdit: boolean;
  onWire: () => void;
  onCalibrate: () => void;
  onBackfill: () => void;
  onDetach: () => void;
};

/** One blueprint running (or waiting to) on a device: what it reads, what it writes, what's missing. */
export function PostprocessingItem({
  deviceUuid,
  postprocessing,
  measurements,
  algorithms,
  latestVersion,
  canEdit,
  onWire,
  onCalibrate,
  onBackfill,
  onDetach,
}: PostprocessingItemProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const version = useQuery(
    blueprintRepository.version({
      path: { blueprint_id: postprocessing.blueprint_id, number: postprocessing.blueprint_version },
    }),
  );
  const [refused, setRefused] = useState<string[]>([]);
  const toggle = useMutation({
    ...postprocessingRepository.update(),
    onSuccess: async () => {
      setRefused([]);
      await queryClient.invalidateQueries({ queryKey: postprocessingRepository.listKey({ path: { device_uuid: deviceUuid } }) });
    },
    onError: (error) => setRefused(errorMessages(error)),
  });
  const byId = new Map(measurements.map((row) => [row.id, row]));
  const calibrates = version.data ? calibratedSteps(version.data, algorithms).length > 0 : false;
  const slots = version.data?.inputs.map((input) => input.slot) ?? Object.keys(postprocessing.input_bindings);

  return (
    <li className="flex flex-col gap-3 border-b border-separator-border pb-4 last:border-b-0 last:pb-0">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            to={routes.blueprint}
            params={{ blueprintId: postprocessing.blueprint_id }}
            className="min-w-0 rounded-full text-body-medium break-words text-text-primary outline-hidden hover:text-accent-500 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            {postprocessing.blueprint_name}
          </Link>
          <span className="text-caption-1-regular text-text-tertiary tabular-nums">v{postprocessing.blueprint_version}</span>
          <PostprocessingStateChip postprocessing={postprocessing} />
        </div>
        {canEdit ? (
          <Button
            type="button"
            size="xs"
            variant={postprocessing.is_enabled ? "secondary" : "primary"}
            disabled={toggle.isPending}
            onClick={() =>
              toggle.mutate({
                path: { device_uuid: deviceUuid, postprocessing_id: postprocessing.id },
                body: { is_enabled: !postprocessing.is_enabled },
              })
            }
          >
            {postprocessing.is_enabled
              ? formatMessage({ id: "feature.postprocessing.item.stop", defaultMessage: "Stop" })
              : formatMessage({ id: "feature.postprocessing.item.start", defaultMessage: "Start" })}
          </Button>
        ) : null}
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-body-regular sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-caption-1-medium text-text-secondary">
            {formatMessage({ id: "feature.postprocessing.item.reads", defaultMessage: "Inputs" })}
          </dt>
          {slots.map((slot) => {
            const bound = postprocessing.input_bindings[slot];
            const row = bound ? byId.get(bound) : undefined;
            return (
              <dd key={slot} className="min-w-0 break-words text-text-primary">
                <span className="font-mono">{slot}</span>
                <span className="text-text-tertiary"> ← </span>
                {row ? (
                  channelLabel(row)
                ) : (
                  <span className="text-text-tertiary">
                    {formatMessage({ id: "feature.postprocessing.item.unbound", defaultMessage: "not bound" })}
                  </span>
                )}
              </dd>
            );
          })}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-caption-1-medium text-text-secondary">
            {formatMessage({ id: "feature.postprocessing.item.writes", defaultMessage: "Outputs" })}
          </dt>
          {postprocessing.outputs.map((output) => (
            <dd key={output.measurement_id} className="min-w-0 font-mono break-words text-text-primary">
              {output.channel}
              {output.unit ? <span className="text-text-tertiary"> ({output.unit})</span> : null}
            </dd>
          ))}
        </div>
      </dl>
      {postprocessing.problems.length ? (
        <ul className="flex flex-col gap-0.5">
          {postprocessing.problems.map((problem) => (
            <li key={problem} className="text-caption-1-regular text-text-secondary">
              {problem}
            </li>
          ))}
        </ul>
      ) : null}
      {latestVersion !== undefined && latestVersion > postprocessing.blueprint_version ? (
        <p className="text-caption-1-regular text-text-tertiary">
          {formatMessage(
            {
              id: "feature.postprocessing.item.newerVersion",
              defaultMessage: "Version {number} is available. Move to it from Settings.",
            },
            { number: latestVersion },
          )}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {canEdit ? (
          <Button type="button" size="xs" variant="secondary" onClick={onWire}>
            {formatMessage({ id: "feature.postprocessing.item.wiring", defaultMessage: "Settings" })}
          </Button>
        ) : null}
        {calibrates ? (
          <Button type="button" size="xs" variant="secondary" onClick={onCalibrate}>
            {formatMessage({ id: "feature.postprocessing.item.calibration", defaultMessage: "Calibration" })}
          </Button>
        ) : null}
        <Button type="button" size="xs" variant="secondary" onClick={onBackfill}>
          {formatMessage({ id: "feature.postprocessing.item.backfill", defaultMessage: "Recompute history" })}
        </Button>
        {canEdit ? (
          <Button
            type="button"
            size="xs"
            variant="danger"
            iconOnly
            leadingIcon={RiDeleteBinLine}
            aria-label={formatMessage({ id: "feature.postprocessing.item.detach", defaultMessage: "Detach blueprint" })}
            onClick={onDetach}
          />
        ) : null}
      </div>
      <StartRefusedDialog
        reasons={refused}
        blueprintName={postprocessing.blueprint_name}
        onCalibrate={calibrates ? onCalibrate : undefined}
        onClose={() => setRefused([])}
      />
    </li>
  );
}
