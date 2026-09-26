import type { SourceRead } from "@mtt/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { formLevelMessage, readApiError } from "@/lib/api-errors";
import { sourceTitle } from "@/features/source/model";
import { sourceRepository } from "@/features/source/repository";
import { termsRepository } from "@/features/terms/repository";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";

export type RenewSourceTermsDialogProps = {
  source: Pick<SourceRead, "id" | "label" | "server" | "topic"> | null;
  onClose: () => void;
  onRenewed: (source: SourceRead) => void;
};

/** Accept the current source terms again: restarts a paused bridge and cancels the pending deletion. */
export function RenewSourceTermsDialog({ source, onClose, onRenewed }: RenewSourceTermsDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const renew = useMutation({
    ...termsRepository.renewSource(),
    onSuccess: async (renewed) => {
      await queryClient.invalidateQueries({ queryKey: sourceRepository.listKey() });
      onRenewed(renewed);
      close();
    },
  });
  const failure = renew.error ? readApiError(renew.error) : null;

  function close() {
    renew.reset();
    onClose();
  }

  return (
    <TermsDialog
      open={source !== null}
      kind="source"
      onClose={close}
      onAccepted={(acceptance) =>
        // No terms on this instance: nothing to renew.
        !acceptance
          ? close()
          : source &&
            renew.mutate({
          path: { source_id: source.id },
          body: { terms_version: acceptance.version, terms_locale: acceptance.locale },
        })
      }
      acceptLabel={
        source
          ? formatMessage(
              { id: "feature.source.renew.accept", defaultMessage: "Renew {source}" },
              { source: sourceTitle(source) },
            )
          : undefined
      }
      pending={renew.isPending}
      error={
        failure
          ? failure.fields.terms_version
            ? formatMessage({
                id: "feature.source.renew.outdated",
                defaultMessage: "The terms changed while you were reading. Close and open them again.",
              })
            : failure.status === 502
              ? formatMessage({
                  id: "feature.source.renew.bridgeFailed",
                  defaultMessage: "The bridge could not be restarted, so the terms were not renewed. Try again.",
                })
              : (formLevelMessage(renew.error) ??
                formatMessage({ id: "feature.source.renew.error", defaultMessage: "The terms were not renewed. Try again." }))
          : null
      }
    />
  );
}
