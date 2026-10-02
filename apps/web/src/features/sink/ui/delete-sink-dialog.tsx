import type { SinkRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { sinkTitle } from "@/features/sink/model";
import { sinkRepository } from "@/features/sink/repository";

export type DeleteSinkDialogProps = {
  sink: Pick<SinkRead, "id" | "label" | "mesh_ids" | "device_ids"> | null;
  onClose: () => void;
  /** The API refuses to delete a sink with meshes or devices attached: edit it to detach them. */
  onEdit: () => void;
};

export function DeleteSinkDialog({ sink, onClose, onEdit }: DeleteSinkDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const destroy = useMutation({
    ...sinkRepository.destroy(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sinkRepository.listKey() });
      onClose();
    },
  });
  const status = destroy.error ? readApiError(destroy.error).status : undefined;
  const attached = sink ? sink.mesh_ids.length + sink.device_ids.length : 0;

  return (
    <Modal
      open={sink !== null}
      title={formatMessage({ id: "feature.sink.deleteDialog.title", defaultMessage: "Delete sink" })}
      description={
        sink
          ? formatMessage(
              {
                id: "feature.sink.deleteDialog.description",
                defaultMessage:
                  "This revokes the credentials of {sink} and disconnects its consumers. This can't be undone.",
              },
              { sink: sinkTitle(sink) },
            )
          : ""
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        {attached > 0 || status === 409 ? (
          <StatusCopy>
            {formatMessage({
              id: "feature.sink.deleteDialog.attached",
              defaultMessage:
                "The sink still sends meshes or devices. Edit it, untick them all, then delete it.",
            })}
          </StatusCopy>
        ) : null}
        {destroy.error && status !== 409 ? (
          <StatusCopy>
            {status === 502
              ? formatMessage({
                  id: "feature.sink.deleteDialog.brokerFailed",
                  defaultMessage: "The broker could not revoke the credentials, so the sink was kept. Try again.",
                })
              : formatMessage({ id: "feature.sink.deleteDialog.error", defaultMessage: "The sink was not deleted. Try again." })}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "feature.sink.deleteDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          {attached > 0 ? (
            <Button type="button" size="small" onClick={onEdit}>
              {formatMessage({ id: "feature.sink.deleteDialog.edit", defaultMessage: "Edit sink" })}
            </Button>
          ) : (
            <Button
              type="button"
              variant="danger"
              size="small"
              disabled={destroy.isPending}
              onClick={() => sink && destroy.mutate({ path: { sink_id: sink.id } })}
            >
              {destroy.isPending
                ? formatMessage({ id: "feature.sink.deleteDialog.deleting", defaultMessage: "Deleting" })
                : formatMessage({ id: "feature.sink.deleteDialog.confirm", defaultMessage: "Delete sink" })}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
