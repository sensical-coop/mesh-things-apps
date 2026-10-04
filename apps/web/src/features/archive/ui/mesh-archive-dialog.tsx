import type { DeviceRead, Mesh } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { devicesToSwitch, meshArchiveState } from "@/features/archive/model";
import { archiveRepository } from "@/features/archive/repository";
import { deviceRepository } from "@/features/device/repository";
import { meshRepository } from "@/features/mesh/repository";
import { meshTitle } from "@/features/mesh/model";

export type MeshArchiveDialogProps = {
  mesh: Pick<Mesh, "id" | "label" | "channel_id">;
  devices: readonly DeviceRead[];
  open: boolean;
  onClose: () => void;
};

/**
 * Switches S3 storage on or off for every device of a mesh at once. The API has no
 * mesh-wide setting, so it saves each device that has to change.
 */
export function MeshArchiveDialog({ mesh, devices, open, onClose }: MeshArchiveDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const state = meshArchiveState(devices);
  const apply = useMutation({
    mutationFn: async (enabled: boolean) => {
      const results = await Promise.allSettled(
        devicesToSwitch(devices, enabled).map((device) => archiveRepository.setDeviceArchive(device.uuid, enabled)),
      );
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed > 0) throw new Error(String(failed));
    },
    // Even a partial failure changed some devices, so refresh either way.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: deviceRepository.listKey() }),
        queryClient.invalidateQueries({ queryKey: meshRepository.devicesKey({ path: { mesh_id: mesh.id } }) }),
        queryClient.invalidateQueries({ queryKey: archiveRepository.manifestKey({ path: { mesh_id: mesh.id } }) }),
        ...devices.map((device) =>
          queryClient.invalidateQueries({ queryKey: deviceRepository.retrieveKey({ path: { device_uuid: device.uuid } }) }),
        ),
      ]),
    onSuccess: onClose,
  });

  return (
    <Modal
      open={open}
      title={formatMessage(
        { id: "feature.archive.meshDialog.title", defaultMessage: "S3 storage — {mesh}" },
        { mesh: meshTitle(mesh) },
      )}
      description={formatMessage(
        {
          id: "feature.archive.meshDialog.description",
          defaultMessage:
            "{devices,plural,one{{archived} of # device on this mesh are stored in S3. This changes every one of them at once.} other{{archived} of # devices on this mesh are stored in S3. This changes every one of them at once.}}",
        },
        { archived: state.archived, devices: state.devices },
      )}
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        <p className="text-caption-1-regular text-text-secondary">
          {formatMessage({
            id: "feature.archive.meshDialog.hint",
            defaultMessage:
              "Stored devices keep their decoded and derived readings from now on. Turning storage off stops storing new ones, but keeps already stored data.",
          })}
        </p>
        <p className="text-caption-1-regular text-text-tertiary">
          {formatMessage({
            id: "feature.archive.settingsDialog.terms",
            defaultMessage: "Store only the devices you need, and only while you need them.",
          })}
        </p>
        {apply.error ? (
          <StatusCopy>
            {formatMessage(
              {
                id: "feature.archive.meshDialog.error",
                defaultMessage:
                  "{failed,plural,one{# device was not saved. Try again.} other{# devices were not saved. Try again.}}",
              },
              { failed: Number(apply.error.message) || 0 },
            )}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "feature.archive.settingsDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          {state.archived > 0 ? (
            <Button
              type="button"
              variant={state.archived < state.devices ? "secondary" : "primary"}
              size="small"
              disabled={apply.isPending}
              onClick={() => apply.mutate(false)}
            >
              {formatMessage({ id: "feature.archive.meshDialog.disable", defaultMessage: "Stop storing all" })}
            </Button>
          ) : null}
          {state.archived < state.devices ? (
            <Button type="button" size="small" disabled={apply.isPending} onClick={() => apply.mutate(true)}>
              {formatMessage(
                {
                  id: "feature.archive.meshDialog.enable",
                  defaultMessage: "{count,plural,one{Store all # device} other{Store all # devices}}",
                },
                { count: state.devices },
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
