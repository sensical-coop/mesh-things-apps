import type { SinkRead } from "@mtt/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { formLevelMessage, readApiError } from "@/lib/api-errors";
import { sinkTitle } from "@/features/sink/model";
import { sinkRepository } from "@/features/sink/repository";
import { termsRepository } from "@/features/terms/repository";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";

export type RenewSinkTermsDialogProps = {
  sink: Pick<SinkRead, "id" | "label"> | null;
  onClose: () => void;
  onRenewed: (sink: SinkRead) => void;
};

/** Accept the current sink terms again: resumes a paused sink with the same credentials. */
export function RenewSinkTermsDialog({ sink, onClose, onRenewed }: RenewSinkTermsDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const renew = useMutation({
    ...termsRepository.renewSink(),
    onSuccess: async (renewed) => {
      await queryClient.invalidateQueries({ queryKey: sinkRepository.listKey() });
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
      open={sink !== null}
      kind="sink"
      onClose={close}
      onAccepted={(acceptance) =>
        // No terms on this instance: nothing to renew.
        !acceptance
          ? close()
          : sink &&
            renew.mutate({
              path: { sink_id: sink.id },
              body: { terms_version: acceptance.version, terms_locale: acceptance.locale },
            })
      }
      acceptLabel={
        sink
          ? formatMessage({ id: "feature.sink.renew.accept", defaultMessage: "Renew {sink}" }, { sink: sinkTitle(sink) })
          : undefined
      }
      pending={renew.isPending}
      error={
        failure
          ? failure.fields.terms_version
            ? formatMessage({
                id: "feature.sink.renew.outdated",
                defaultMessage: "The terms changed while you were reading. Close and open them again.",
              })
            : failure.status === 502
              ? formatMessage({
                  id: "feature.sink.renew.brokerFailed",
                  defaultMessage: "The broker could not resume the sink, so the terms were not renewed. Try again.",
                })
              : (formLevelMessage(renew.error) ??
                formatMessage({ id: "feature.sink.renew.error", defaultMessage: "The terms were not renewed. Try again." }))
          : null
      }
    />
  );
}
