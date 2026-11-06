import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { formLevelMessage, readApiError } from "@mtt/contracts/errors";
import { type TermsAcceptance, type TermsKind } from "@/features/terms/model";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";

type RenewKind = Extract<TermsKind, "mesh" | "source" | "sink">;

const RENEW_COPY: Record<
  RenewKind,
  {
    outdated: { id: string; defaultMessage: string };
    resumeFailed: { id: string; defaultMessage: string };
    generic: { id: string; defaultMessage: string };
  }
> = {
  mesh: {
    outdated: {
      id: "feature.terms.renew.outdated",
      defaultMessage: "The terms changed while you were reading. Close and open them again.",
    },
    resumeFailed: {
      id: "feature.mesh.renew.resumeFailed",
      defaultMessage: "The mesh's gateways could not be resumed, so the terms were not renewed. Try again.",
    },
    generic: { id: "feature.mesh.renew.error", defaultMessage: "The terms were not renewed. Try again." },
  },
  source: {
    outdated: {
      id: "feature.source.renew.outdated",
      defaultMessage: "The terms changed while you were reading. Close and open them again.",
    },
    resumeFailed: {
      id: "feature.source.renew.bridgeFailed",
      defaultMessage: "The bridge could not be restarted, so the terms were not renewed. Try again.",
    },
    generic: { id: "feature.source.renew.error", defaultMessage: "The terms were not renewed. Try again." },
  },
  sink: {
    outdated: {
      id: "feature.sink.renew.outdated",
      defaultMessage: "The terms changed while you were reading. Close and open them again.",
    },
    resumeFailed: {
      id: "feature.sink.renew.brokerFailed",
      defaultMessage: "The broker could not resume the sink, so the terms were not renewed. Try again.",
    },
    generic: { id: "feature.sink.renew.error", defaultMessage: "The terms were not renewed. Try again." },
  },
};

export type RenewTermsDialogProps = {
  open: boolean;
  kind: RenewKind;
  acceptLabel?: string;
  pending: boolean;
  error: unknown;
  onClose: () => void;
  onAccepted: (acceptance: TermsAcceptance) => void;
};

/** Accept the current terms again. The caller runs the mutation and invalidates. */
export function RenewTermsDialog({
  open,
  kind,
  acceptLabel,
  pending,
  error,
  onClose,
  onAccepted,
}: RenewTermsDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const failure = error ? readApiError(error) : null;
  const copy = RENEW_COPY[kind];

  return (
    <TermsDialog
      open={open}
      kind={kind}
      onClose={onClose}
      onAccepted={(acceptance) => (!acceptance ? onClose() : onAccepted(acceptance))}
      acceptLabel={acceptLabel}
      pending={pending}
      error={
        failure
          ? failure.fields.terms_version
            ? formatMessage(copy.outdated)
            : failure.status === 502
              ? formatMessage(copy.resumeFailed)
              : (formLevelMessage(error) ?? formatMessage(copy.generic))
          : null
      }
    />
  );
}
