import type { DevicePostprocessing } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { errorMessages } from "@/features/blueprint/model";
import { deviceRepository } from "@/features/device/repository";
import { postprocessingRepository } from "@/features/postprocessing/repository";
import { blueprintRepository } from "@/features/blueprint/repository";
import { dialogActionsClass } from "@/lib/dialog-actions";

export type DetachPostprocessingDialogProps = {
  deviceUuid: string;
  postprocessing: DevicePostprocessing | null;
  onClose: () => void;
};

export function DetachPostprocessingDialog({ deviceUuid, postprocessing, onClose }: DetachPostprocessingDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const detach = useMutation({
    ...postprocessingRepository.detach(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: postprocessingRepository.listKey({ path: { device_uuid: deviceUuid } }) });
      await queryClient.invalidateQueries({ queryKey: deviceRepository.measurementsKey({ path: { device_uuid: deviceUuid } }) });
      await queryClient.invalidateQueries({ queryKey: deviceRepository.retrieveKey({ path: { device_uuid: deviceUuid } }) });
      await queryClient.invalidateQueries({ queryKey: blueprintRepository.listKey() });
      onClose();
    },
  });

  return (
    <Modal
      open={postprocessing !== null}
      title={formatMessage({ id: "feature.postprocessing.detach.title", defaultMessage: "Detach blueprint" })}
      description={
        postprocessing
          ? formatMessage(
              {
                id: "feature.postprocessing.detach.description",
                defaultMessage:
                  "{name} stops running on this device and its channels ({channels}) are removed, with their alarm settings and calibrations. Readings already stored stay queryable.",
              },
              {
                name: postprocessing.blueprint_name,
                channels: postprocessing.outputs.map((output) => output.channel).join(", ") || "—",
              },
            )
          : ""
      }
      onClose={() => {
        detach.reset();
        onClose();
      }}
    >
      <div className="flex flex-col gap-5">
        {detach.error ? <StatusCopy>{errorMessages(detach.error).join(" ")}</StatusCopy> : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "feature.postprocessing.dialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="small"
            disabled={detach.isPending || !postprocessing}
            onClick={() =>
              postprocessing && detach.mutate({ path: { device_uuid: deviceUuid, postprocessing_id: postprocessing.id } })
            }
          >
            {formatMessage({ id: "feature.postprocessing.detach.confirm", defaultMessage: "Detach" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
