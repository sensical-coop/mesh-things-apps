import type { SourceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { sourceTitle } from "@/features/source/model";
import { sourceRepository } from "@/features/source/repository";
import { meshTitle } from "@/features/mesh/model";
import { meshRepository } from "@/features/mesh/repository";
import { routes } from "@/router";

export type DeleteSourceDialogProps = {
  source: Pick<SourceRead, "id" | "label" | "server" | "root"> | null;
  onClose: () => void;
};

export function DeleteSourceDialog({ source, onClose }: DeleteSourceDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  // The API refuses to delete a source that meshes use, so list them up front.
  const attached = useQuery({
    ...meshRepository.list({ query: { source_id: source?.id ?? "" } }),
    enabled: source !== null,
  });
  const attachedMeshes = attached.data ?? [];
  const destroy = useMutation({
    ...sourceRepository.destroy(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sourceRepository.listKey() });
      onClose();
    },
    // A mesh attached since the dialog opened: show it in the list.
    onError: (error) => {
      if (readApiError(error).status === 409) void attached.refetch();
    },
  });
  const status = destroy.error ? readApiError(destroy.error).status : undefined;
  const blocked = attached.isPending || attachedMeshes.length > 0;

  return (
    <Modal
      open={source !== null}
      title={formatMessage({ id: "feature.source.deleteDialog.title", defaultMessage: "Delete source" })}
      description={
        source
          ? formatMessage(
              {
                id: "feature.source.deleteDialog.description",
                defaultMessage: "This stops bridging {source} into this instance. This can't be undone.",
              },
              { source: sourceTitle(source) },
            )
          : ""
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        {attachedMeshes.length > 0 ? (
          <div className="flex flex-col gap-2">
            <StatusCopy>
              {formatMessage(
                {
                  id: "feature.source.deleteDialog.attached",
                  defaultMessage:
                    "{count, plural, one {This mesh uses the source.} other {These # meshes use the source.}} Open each one, set its source back to Default broker (or delete it), then delete the source.",
                },
                { count: attachedMeshes.length },
              )}
            </StatusCopy>
            <ul className="flex flex-col gap-1">
              {attachedMeshes.map((mesh) => (
                <li key={mesh.id}>
                  <Link
                    to={routes.mesh}
                    params={{ meshId: mesh.id }}
                    className="text-body-medium text-accent-500 underline underline-offset-2"
                  >
                    {meshTitle(mesh)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {destroy.error ? (
          <StatusCopy>
            {status === 409
              ? formatMessage({
                  id: "feature.source.deleteDialog.inUse",
                  defaultMessage: "Meshes still use this source. Move them to another source or delete them first.",
                })
              : status === 502
                ? formatMessage({
                    id: "feature.source.deleteDialog.bridgeFailed",
                    defaultMessage: "The bridge could not be removed, so the source was kept. Try again.",
                  })
                : formatMessage({
                    id: "feature.source.deleteDialog.error",
                    defaultMessage: "The source was not deleted. Try again.",
                  })}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "feature.source.deleteDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="small"
            disabled={destroy.isPending || blocked}
            onClick={() => source && destroy.mutate({ path: { source_id: source.id } })}
          >
            {destroy.isPending
              ? formatMessage({ id: "feature.source.deleteDialog.deleting", defaultMessage: "Deleting" })
              : formatMessage({ id: "feature.source.deleteDialog.confirm", defaultMessage: "Delete source" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
