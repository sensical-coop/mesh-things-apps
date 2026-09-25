import type { MeshViewer } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { meshRepository } from "@/features/mesh/repository";

export type RevokeViewerDialogProps = {
  meshId: string;
  grant: MeshViewer | null;
  onClose: () => void;
};

export function RevokeViewerDialog({ meshId, grant, onClose }: RevokeViewerDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const revoke = useMutation({
    ...meshRepository.revokeViewer(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meshRepository.viewersKey({ path: { mesh_id: meshId } }) });
      close();
    },
  });

  // Clear a failed attempt so reopening for someone else starts clean.
  function close() {
    revoke.reset();
    onClose();
  }

  return (
    <Modal
      open={grant !== null}
      title={formatMessage({ id: "feature.mesh.revokeDialog.title", defaultMessage: "Revoke access" })}
      description={
        grant
          ? formatMessage(
              {
                id: "feature.mesh.revokeDialog.description",
                defaultMessage:
                  "{name} will no longer be able to view this mesh, its devices, or their readings. We'll email them.",
              },
              { name: grant.viewer.name },
            )
          : ""
      }
      onClose={close}
    >
      <div className="flex flex-col gap-5">
        {revoke.error ? (
          <StatusCopy>
            {formatMessage({
              id: "feature.mesh.revokeDialog.error",
              defaultMessage: "Access was not revoked. Try again.",
            })}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={close}>
            {formatMessage({ id: "feature.mesh.revokeDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="small"
            disabled={revoke.isPending}
            onClick={() => grant && revoke.mutate({ path: { mesh_id: meshId, owner_id: grant.viewer.id } })}
          >
            {revoke.isPending
              ? formatMessage({ id: "feature.mesh.revokeDialog.revoking", defaultMessage: "Revoking" })
              : formatMessage({ id: "feature.mesh.revokeDialog.confirm", defaultMessage: "Revoke access" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
