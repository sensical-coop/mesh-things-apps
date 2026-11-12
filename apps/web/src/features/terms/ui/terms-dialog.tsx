import { Button } from "@mtt/ui/components/base/buttons/button";
import { TermsChecklist } from "@mtt/ui/forms/terms-checklist";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { dialogActionsClass } from "@mtt/ui/forms/dialog-actions";
import { termsLocale, useTermsAcceptance, type TermsAcceptance } from "@mtt/contracts/terms";
import { type TermsKind } from "@/features/terms/model";
import { termsRepository } from "@/features/terms/repository";
import { TermsFootnote } from "@/features/terms/ui/terms-footnote";

export type TermsDialogProps = {
  open: boolean;
  kind: TermsKind;
  onClose: () => void;
  /**
   * What was accepted, or `null` when this instance asks for no terms (the route
   * answered 404): carry on without sending any.
   */
  onAccepted: (acceptance: TermsAcceptance | null) => void;
  /** Button text; "Accept and continue" by default. */
  acceptLabel?: string;
  /** While the caller saves the acceptance (renewals). */
  pending?: boolean;
  /** Why the caller's save failed, if it did. */
  error?: string | null;
};

/**
 * Shows the terms of `kind` as the API serves them, in the console's language,
 * and hands back what was accepted once every statement is ticked.
 */
export function TermsDialog({
  open,
  kind,
  onClose,
  onAccepted,
  acceptLabel,
  pending = false,
  error = null,
}: TermsDialogProps): ReactElement {
  const { formatMessage, locale } = useIntl();
  const localeParam = { locale: termsLocale(locale) };
  const options = {
    account: termsRepository.account(localeParam),
    mesh: termsRepository.mesh(localeParam),
    source: termsRepository.source(localeParam),
    sink: termsRepository.sink(localeParam),
  }[kind];
  const terms = useQuery({
    ...options,
    enabled: open,
  });
  // A self-hosted instance with terms switched off answers 404: nothing to accept.
  const { notRequired, accepted, complete, acceptance, toggle, reset } = useTermsAcceptance(terms);
  const canAccept = complete && !pending;

  function close() {
    reset();
    onClose();
  }

  function accept() {
    if (canAccept) onAccepted(acceptance);
  }

  return (
    <Modal
      open={open}
      title={terms.data?.title ?? formatMessage({ id: "feature.terms.dialog.loadingTitle", defaultMessage: "Terms" })}
      description={terms.data?.description ?? ""}
      onClose={close}
    >
      <div className="flex flex-col gap-5">
        {terms.isPending ? <SkeletonRows /> : null}
        {terms.error ? (
          <StatusCopy>
            {notRequired
              ? formatMessage({
                  id: "feature.terms.dialog.notRequired",
                  defaultMessage: "This instance doesn't ask for terms. Continue.",
                })
              : formatMessage({
                  id: "feature.terms.dialog.loadError",
                  defaultMessage: "The terms didn't load and they can't be accepted yet. Try again.",
                })}
          </StatusCopy>
        ) : null}
        {terms.data ? (
          <TermsChecklist
            statements={terms.data.statements}
            accepted={accepted}
            onToggle={toggle}
            idPrefix={`terms-${kind}`}
            footnote={
              <>
                {terms.data.footnote}{" "}
                <TermsFootnote kind={kind} />
              </>
            }
          />
        ) : null}
        {error ? <StatusCopy>{error}</StatusCopy> : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={close}>
            {formatMessage({ id: "feature.terms.dialog.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="button" size="small" disabled={!canAccept} onClick={accept}>
            {pending
              ? formatMessage({ id: "feature.terms.dialog.saving", defaultMessage: "Saving" })
              : notRequired
                ? formatMessage({ id: "feature.terms.dialog.continue", defaultMessage: "Continue" })
              : (acceptLabel ??
                formatMessage({ id: "feature.terms.dialog.accept", defaultMessage: "Accept and continue" }))}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

