import { Button } from "@mtt/ui/components/base/buttons/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { authRepository } from "@/features/auth/repository";
import { clearPendingOwnerKey } from "@/features/auth/pending-owner-key";

export function DeleteAccountDialog({
  open,
  onClose,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
}): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const destroy = useMutation({
    ...authRepository.destroy(),
    onSuccess: async () => {
      clearPendingOwnerKey();
      queryClient.clear();
      onClose();
      await onDeleted();
    },
  });

  return (
    <Modal
      open={open}
      title={formatMessage({ id: "feature.auth.deleteAccountDialog.title", defaultMessage: "Delete account" })}
      description={formatMessage({
        id: "feature.auth.deleteAccountDialog.description",
        defaultMessage: "This deletes your account along with everything you own in Mesh Things. This can't be undone.",
      })}
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        {destroy.error ? (
          <StatusCopy>
            {formatMessage({
              id: "feature.auth.deleteAccountDialog.error",
              defaultMessage: "The account was not deleted. Try again.",
            })}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            {formatMessage({ id: "feature.auth.deleteAccountDialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="small"
            disabled={destroy.isPending}
            onClick={() => destroy.mutate({})}
          >
            {destroy.isPending
              ? formatMessage({ id: "feature.auth.deleteAccountDialog.deleting", defaultMessage: "Deleting" })
              : formatMessage({ id: "feature.auth.deleteAccountDialog.confirm", defaultMessage: "Delete account" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
