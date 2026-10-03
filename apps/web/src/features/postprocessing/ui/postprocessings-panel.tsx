import type { DeviceMeasurement, DevicePostprocessing } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { RiAddLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { useMe } from "@/features/auth/use-me";
import { canAttachBlueprint } from "@/features/blueprint/model";
import { blueprintRepository } from "@/features/blueprint/repository";
import { postprocessingRepository } from "@/features/postprocessing/repository";
import { BackfillDialog } from "@/features/postprocessing/ui/backfill-dialog";
import { CalibrationDialog } from "@/features/postprocessing/ui/calibration-dialog";
import { DetachPostprocessingDialog } from "@/features/postprocessing/ui/detach-postprocessing-dialog";
import { PostprocessingDialog } from "@/features/postprocessing/ui/postprocessing-dialog";
import { PostprocessingItem } from "@/features/postprocessing/ui/postprocessing-item";

export type PostprocessingsPanelProps = {
  deviceUuid: string;
  meshOwnerId: string;
  measurements: readonly DeviceMeasurement[];
  canEdit: boolean;
};

type Open =
  | { kind: "attach" }
  | { kind: "wire" | "calibrate" | "backfill" | "detach"; postprocessing: DevicePostprocessing }
  | null;

/** The blueprints attached to a device. */
export function PostprocessingsPanel({ deviceUuid, meshOwnerId, measurements, canEdit }: PostprocessingsPanelProps): ReactElement | null {
  const { formatMessage } = useIntl();
  const { me } = useMe();
  const attached = useQuery(postprocessingRepository.list({ path: { device_uuid: deviceUuid } }));
  const blueprints = useQuery(blueprintRepository.list());
  const algorithms = useQuery(blueprintRepository.algorithms());
  const [open, setOpen] = useState<Open>(null);
  const latestById = new Map((blueprints.data ?? []).map((row) => [row.id, row.latest_version.number]));
  const attachable = (blueprints.data ?? []).filter((row) => canAttachBlueprint(row, meshOwnerId, me));
  const calibrating = open?.kind === "calibrate" ? open.postprocessing : null;
  const calibratingVersion = useQuery({
    ...blueprintRepository.version({
      path: { blueprint_id: calibrating?.blueprint_id ?? "", number: calibrating?.blueprint_version ?? 0 },
    }),
    enabled: calibrating !== null,
  });
  const rows = attached.data ?? [];
  // A viewer of a public mesh sees what runs, but only an editor can add to an empty list.
  if (!canEdit && attached.data && rows.length === 0) return null;

  return (
    <Frame className="shadow-card">
      <FrameHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <FrameTitle>{formatMessage({ id: "feature.postprocessing.panel.title", defaultMessage: "Postprocessing" })}</FrameTitle>
          <FrameDescription>
            {formatMessage({
              id: "feature.postprocessing.panel.description",
              defaultMessage:
                "Below you can find blueprints computing new channels based on readings from this device in real time. Raw readings remain unchanged.",
            })}
          </FrameDescription>
        </div>
        {canEdit ? (
          <Button type="button" size="xs" variant="secondary" leadingIcon={RiAddLine} onClick={() => setOpen({ kind: "attach" })}>
            {formatMessage({ id: "feature.postprocessing.panel.attach", defaultMessage: "Attach blueprint" })}
          </Button>
        ) : null}
      </FrameHeader>
      <FramePanel>
        {attached.isPending ? <SkeletonRows /> : null}
        {attached.error ? (
          <StatusCopy>
            {formatMessage({
              id: "feature.postprocessing.panel.error",
              defaultMessage: "Postprocessing didn't load. Try again in a moment.",
            })}
          </StatusCopy>
        ) : null}
        {attached.data && rows.length === 0 ? (
          <StatusCopy>
            {formatMessage({
              id: "feature.postprocessing.panel.empty",
              defaultMessage: "No blueprint attached. Attach a blueprint to derive channels such as a dew point or a calibrated concentration.",
            })}
          </StatusCopy>
        ) : null}
        {rows.length ? (
          <ul className="flex flex-col gap-4">
            {rows.map((row) => (
              <PostprocessingItem
                key={row.id}
                deviceUuid={deviceUuid}
                postprocessing={row}
                measurements={measurements}
                algorithms={algorithms.data ?? []}
                latestVersion={latestById.get(row.blueprint_id)}
                canEdit={canEdit}
                onWire={() => setOpen({ kind: "wire", postprocessing: row })}
                onCalibrate={() => setOpen({ kind: "calibrate", postprocessing: row })}
                onBackfill={() => setOpen({ kind: "backfill", postprocessing: row })}
                onDetach={() => setOpen({ kind: "detach", postprocessing: row })}
              />
            ))}
          </ul>
        ) : null}
      </FramePanel>
      {open?.kind === "attach" ? (
        <PostprocessingDialog
          deviceUuid={deviceUuid}
          measurements={measurements}
          blueprints={attachable}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open?.kind === "wire" ? (
        <PostprocessingDialog
          deviceUuid={deviceUuid}
          measurements={measurements}
          blueprints={attachable}
          postprocessing={open.postprocessing}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {calibrating && calibratingVersion.data && algorithms.data ? (
        <CalibrationDialog
          deviceUuid={deviceUuid}
          postprocessing={calibrating}
          version={calibratingVersion.data}
          algorithms={algorithms.data}
          canEdit={canEdit}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open?.kind === "backfill" ? (
        <BackfillDialog deviceUuid={deviceUuid} postprocessing={open.postprocessing} canEdit={canEdit} onClose={() => setOpen(null)} />
      ) : null}
      <DetachPostprocessingDialog
        deviceUuid={deviceUuid}
        postprocessing={open?.kind === "detach" ? open.postprocessing : null}
        onClose={() => setOpen(null)}
      />
    </Frame>
  );
}
