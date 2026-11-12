import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { formLevelMessage } from "@mtt/contracts/errors";
import { termsFields } from "@mtt/contracts/terms";
import { invalidateMe } from "@mtt/contracts/session";
import { termsAcceptError } from "@/features/terms/accept-error";
import { termsRepository } from "@/features/terms/repository";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";

export type AcceptAccountTermsDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AcceptAccountTermsDialog({ open, onClose }: AcceptAccountTermsDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const accept = useMutation({
    ...termsRepository.acceptAccount(),
    onSuccess: async () => {
      await invalidateMe(queryClient);
      close();
    },
  });

  function close() {
    accept.reset();
    onClose();
  }

  return (
    <TermsDialog
      open={open}
      kind="account"
      onClose={close}
      onAccepted={(acceptance) =>
        // No terms on this instance: nothing to accept.
        acceptance
          ? accept.mutate({ data: termsFields(acceptance) })
          : close()
      }
      acceptLabel={formatMessage({ id: "feature.terms.account.accept", defaultMessage: "Accept terms" })}
      pending={accept.isPending}
      error={termsAcceptError(
        accept.error,
        formatMessage,
        () =>
          formLevelMessage(accept.error) ??
          formatMessage({ id: "feature.terms.account.error", defaultMessage: "The terms were not accepted. Try again." }),
      )}
    />
  );
}
