import type { Mesh } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { meshRepository } from "@/features/mesh/repository";
import { meshTitle } from "@/features/mesh/model";

export function DeleteMeshDialog({
  mesh,
  onClose,
  onDeleted,
}: {
  mesh: Pick<Mesh, "id" | "label" | "channel_id"> | null;
  onClose: () => void;
  onDeleted?: () => void;
}): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const destroy = useMutation({
    ...meshRepository.destroy(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meshRepository.listKey() });
      onClose();
      onDeleted?.();
    },
  });

  return (
    <Modal
      open={mesh !== null}
      title={formatMessage({ id: "feature.mesh.deleteDialog.title", defaultMessage: "Delete mesh" })}
      description={
        mesh
          ? formatMessage(
              {
                id: "feature.mesh.deleteDialog.description",
                defaultMessage:
                  "This deletes {mesh} and every device registered on it. This can't be undone. Its stored readings are deleted after a grace period, so export them first if you need them.",
              },
              { mesh: meshTitle(mesh) },
            )
          : ""
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        {destroy.error ? (
          <StatusCopy>
            {formatMessage({
              id: "feature.mesh.deleteDialog.error",
              defaultMessage: "The mesh was not deleted. Try again.",
            })}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "feature.mesh.deleteDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="small"
            disabled={destroy.isPending}
            onClick={() => mesh && destroy.mutate({ path: { mesh_id: mesh.id } })}
          >
            {destroy.isPending
              ? formatMessage({ id: "feature.mesh.deleteDialog.deleting", defaultMessage: "Deleting" })
              : formatMessage({ id: "feature.mesh.deleteDialog.confirm", defaultMessage: "Delete mesh" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
