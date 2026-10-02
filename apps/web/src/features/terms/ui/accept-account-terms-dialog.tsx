import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { formLevelMessage, readApiError } from "@/lib/api-errors";
import { authRepository } from "@/features/auth/repository";
import { termsRepository } from "@/features/terms/repository";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";

export type AcceptAccountTermsDialogProps = {
  open: boolean;
  onClose: () => void;
};

/** Accept the current account terms, e.g. after they changed since signing up. */
export function AcceptAccountTermsDialog({ open, onClose }: AcceptAccountTermsDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const accept = useMutation({
    ...termsRepository.acceptAccount(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
      close();
    },
  });
  const failure = accept.error ? readApiError(accept.error) : null;

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
          ? accept.mutate({ body: { terms_version: acceptance.version, terms_locale: acceptance.locale } })
          : close()
      }
      acceptLabel={formatMessage({ id: "feature.terms.account.accept", defaultMessage: "Accept terms" })}
      pending={accept.isPending}
      error={
        failure
          ? failure.fields.terms_version
            ? formatMessage({
                id: "feature.terms.renew.outdated",
                defaultMessage: "The terms changed while you were reading. Close and open them again.",
              })
            : (formLevelMessage(accept.error) ??
              formatMessage({ id: "feature.terms.account.error", defaultMessage: "The terms were not accepted. Try again." }))
          : null
      }
    />
  );
}
