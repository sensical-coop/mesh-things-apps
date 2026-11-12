import { useMutation } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { defineMessages, type MessageDescriptor, useIntl } from "react-intl";
import { formLevelMessage } from "@mtt/contracts/errors";
import { termsFields } from "@mtt/contracts/terms";
import { termsAcceptError } from "@/features/terms/accept-error";
import { type TermsKind } from "@/features/terms/model";
import { termsRepository, type Renewal, type TermsRenewed } from "@/features/terms/repository";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";

type RenewKind = Extract<TermsKind, "mesh" | "source" | "sink">;

const RESUME_FAILED = defineMessages({
  mesh: {
    id: "feature.mesh.renew.resumeFailed",
    defaultMessage: "The mesh's gateways could not be resumed, so the terms were not renewed. Try again.",
  },
  source: {
    id: "feature.source.renew.bridgeFailed",
    defaultMessage: "The bridge could not be restarted, so the terms were not renewed. Try again.",
  },
  sink: {
    id: "feature.sink.renew.brokerFailed",
    defaultMessage: "The broker could not resume the sink, so the terms were not renewed. Try again.",
  },
} satisfies Record<RenewKind, { id: string; defaultMessage: string }>);

export type RenewTermsDialogProps<K extends RenewKind> = {
  kind: K;
  /** What is being renewed; the dialog is open while this is set. */
  entity: { id: string; name: string } | null;
  onClose: () => void;
  /** Runs once the renewal is saved; the caller refreshes what it shows and closes the dialog. */
  onRenewed: (renewed: TermsRenewed<K>) => Promise<void> | void;
};

export function RenewTermsDialog<K extends RenewKind>({
  kind,
  entity,
  onClose,
  onRenewed,
}: RenewTermsDialogProps<K>): ReactElement {
  const { formatMessage } = useIntl();
  const resumeFailed: MessageDescriptor = RESUME_FAILED[kind];
  const renew = useMutation({
    ...(termsRepository.renew[kind] as { mutationFn: (renewal: Renewal) => Promise<TermsRenewed<K>> }),
    onSuccess: async (renewed) => {
      await onRenewed(renewed);
      renew.reset();
    },
  });

  return (
    <TermsDialog
      open={entity !== null}
      kind={kind}
      onClose={() => {
        renew.reset();
        onClose();
      }}
      onAccepted={(acceptance) => {
        if (!acceptance) onClose();
        else if (entity) renew.mutate({ id: entity.id, data: termsFields(acceptance) });
      }}
      acceptLabel={entity ? formatMessage({ id: "feature.terms.renew.accept", defaultMessage: "Renew {name}" }, { name: entity.name }) : undefined}
      pending={renew.isPending}
      error={termsAcceptError(renew.error, formatMessage, (failure) =>
        failure.status === 502
          ? formatMessage(resumeFailed)
          : (formLevelMessage(renew.error) ??
            formatMessage({ id: "feature.terms.renew.error", defaultMessage: "The terms were not renewed. Try again." })),
      )}
    />
  );
}
