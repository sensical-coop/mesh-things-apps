import type { SinkCredentials, SinkRead } from "@mtt/contracts";
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

export type RotateSinkCredentialsDialogProps = {
  sink: Pick<SinkRead, "id" | "label"> | null;
  onClose: () => void;
  onRotated: (credentials: SinkCredentials) => void;
};

/** A lost or leaked password: issue a new one, which also disconnects current consumers. */
export function RotateSinkCredentialsDialog({ sink, onClose, onRotated }: RotateSinkCredentialsDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const rotate = useMutation({
    ...sinkRepository.rotateCredentials(),
    onSuccess: async (credentials) => {
      await queryClient.invalidateQueries({ queryKey: sinkRepository.listKey() });
      rotate.reset();
      onRotated(credentials);
    },
  });

  function close() {
    rotate.reset();
    onClose();
  }

  return (
    <Modal
      open={sink !== null}
      title={formatMessage({ id: "feature.sink.rotate.title", defaultMessage: "Issue a new password" })}
      description={
        sink
          ? formatMessage(
              {
                id: "feature.sink.rotate.description",
                defaultMessage:
                  "The current password of {sink} stops working and its consumers are disconnected until they use the new one.",
              },
              { sink: sinkTitle(sink) },
            )
          : ""
      }
      onClose={close}
    >
      <div className="flex flex-col gap-5">
        {rotate.error ? (
          <StatusCopy>
            {readApiError(rotate.error).status === 502
              ? formatMessage({
                  id: "feature.sink.rotate.brokerFailed",
                  defaultMessage: "The broker could not be told, so the old password still works. Try again.",
                })
              : formatMessage({ id: "feature.sink.rotate.error", defaultMessage: "No new password was issued. Try again." })}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={close}>
            {formatMessage({ id: "feature.sink.rotate.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button
            type="button"
            size="small"
            disabled={rotate.isPending}
            onClick={() => sink && rotate.mutate({ path: { sink_id: sink.id } })}
          >
            {rotate.isPending
              ? formatMessage({ id: "feature.sink.rotate.issuing", defaultMessage: "Issuing" })
              : formatMessage({ id: "feature.sink.rotate.confirm", defaultMessage: "Issue new password" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
