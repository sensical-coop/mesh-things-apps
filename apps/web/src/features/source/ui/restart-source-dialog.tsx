import type { SourceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { sourceTitle } from "@/features/source/model";
import { sourceRepository } from "@/features/source/repository";

export type RestartSourceDialogProps = {
  source: Pick<SourceRead, "id" | "label" | "server" | "topic"> | null;
  onClose: () => void;
  onRestarted: (source: SourceRead) => void;
};

/** Reconnect a source's bridge, for one that shows connected but has stopped bringing in data. */
export function RestartSourceDialog({ source, onClose, onRestarted }: RestartSourceDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const restart = useMutation({
    ...sourceRepository.restart(),
    onSuccess: async (restarted) => {
      await queryClient.invalidateQueries({ queryKey: sourceRepository.listKey() });
      onRestarted(restarted);
      close();
    },
  });
  const status = restart.error ? readApiError(restart.error).status : undefined;

  function close() {
    restart.reset();
    onClose();
  }

  return (
    <Modal
      open={source !== null}
      title={formatMessage({ id: "feature.source.restartDialog.title", defaultMessage: "Restart source" })}
      description={
        source
          ? formatMessage(
              {
                id: "feature.source.restartDialog.description",
                defaultMessage:
                  "This reconnects {source} and subscribes to its topic again. Use it when the source shows connected but its meshes have stopped receiving data. Messages sent during the restart, a few seconds at most, may be missed.",
              },
              { source: sourceTitle(source) },
            )
          : ""
      }
      onClose={close}
    >
      <div className="flex flex-col gap-5">
        {restart.error ? (
          <StatusCopy>
            {status === 409
              ? formatMessage({
                  id: "feature.source.restartDialog.paused",
                  defaultMessage: "This source is paused. Renew its terms to start it again.",
                })
              : status === 502
                ? formatMessage({
                    id: "feature.source.restartDialog.bridgeFailed",
                    defaultMessage: "The broker could not restart the bridge. Try again in a minute.",
                  })
                : formatMessage({
                    id: "feature.source.restartDialog.error",
                    defaultMessage: "The source was not restarted. Try again.",
                  })}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={close}>
            {formatMessage({ id: "feature.source.restartDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button
            type="button"
            size="small"
            disabled={restart.isPending}
            onClick={() => source && restart.mutate({ path: { source_id: source.id } })}
          >
            {restart.isPending
              ? formatMessage({ id: "feature.source.restartDialog.restarting", defaultMessage: "Restarting" })
              : formatMessage({ id: "feature.source.restartDialog.confirm", defaultMessage: "Restart source" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
