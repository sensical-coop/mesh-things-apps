import type { PostprocessingBlueprint } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { blueprintRepository } from "@/features/blueprint/repository";
import { formLevelMessage, readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";

export type DeleteBlueprintDialogProps = {
  blueprint: PostprocessingBlueprint | null;
  onClose: () => void;
  onDeleted?: () => void;
};

export function DeleteBlueprintDialog({ blueprint, onClose, onDeleted }: DeleteBlueprintDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const destroy = useMutation({
    ...blueprintRepository.destroy(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: blueprintRepository.listKey() });
      onDeleted?.();
      onClose();
    },
  });
  const inUse = destroy.error ? readApiError(destroy.error).status === 409 : false;

  return (
    <Modal
      open={blueprint !== null}
      title={formatMessage({ id: "feature.blueprint.deleteDialog.title", defaultMessage: "Delete blueprint" })}
      description={
        blueprint
          ? formatMessage(
              {
                id: "feature.blueprint.deleteDialog.description",
                defaultMessage: "This deletes {name} and all its versions. This can't be undone.",
              },
              { name: blueprint.name },
            )
          : ""
      }
      onClose={() => {
        destroy.reset();
        onClose();
      }}
    >
      <div className="flex flex-col gap-5">
        {destroy.error ? (
          <StatusCopy>
            {inUse
              ? formatMessage({
                  id: "feature.blueprint.deleteDialog.inUse",
                  defaultMessage: "Devices still run a version of this blueprint. Detach it from them first.",
                })
              : `${formatMessage({ id: "feature.blueprint.deleteDialog.failed", defaultMessage: "The blueprint was not deleted." })} ${formLevelMessage(destroy.error) ?? ""}`}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "feature.blueprint.dialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="small"
            disabled={destroy.isPending || inUse || !blueprint}
            onClick={() => blueprint && destroy.mutate({ path: { blueprint_id: blueprint.id } })}
          >
            {destroy.isPending
              ? formatMessage({ id: "feature.blueprint.deleteDialog.deleting", defaultMessage: "Deleting" })
              : formatMessage({ id: "feature.blueprint.deleteDialog.confirm", defaultMessage: "Delete blueprint" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
