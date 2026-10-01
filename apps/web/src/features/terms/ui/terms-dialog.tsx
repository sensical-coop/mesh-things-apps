import { Button } from "@mtt/ui/components/base/buttons/button";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { allStatementsAccepted, termsLocale, type TermsAcceptance, type TermsKind } from "@/features/terms/model";
import { termsRepository } from "@/features/terms/repository";
import { TermsChecklist } from "@/features/terms/ui/terms-checklist";

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
  const query = { query: { locale: termsLocale(locale) } };
  const options = {
    account: termsRepository.account(query),
    mesh: termsRepository.mesh(query),
    source: termsRepository.source(query),
    sink: termsRepository.sink(query),
  }[kind];
  // A 404 means terms are off on this instance: an answer, not worth retrying.
  const terms = useQuery({
    ...options,
    enabled: open,
    retry: (failures: number, error: unknown) => readApiError(error).status !== 404 && failures < 3,
  });
  const [accepted, setAccepted] = useState<ReadonlySet<string>>(new Set());
  const statementIds = (terms.data?.statements ?? []).map((statement) => statement.id);
  // A self-hosted instance with terms switched off answers 404: nothing to accept.
  const notRequired = terms.error ? readApiError(terms.error).status === 404 : false;
  const canAccept =
    (notRequired || (terms.data !== undefined && allStatementsAccepted(statementIds, accepted))) && !pending;

  function toggle(id: string, checked: boolean) {
    setAccepted((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function close() {
    setAccepted(new Set());
    onClose();
  }

  function accept() {
    if (!canAccept) return;
    if (notRequired) {
      onAccepted(null);
      return;
    }
    if (!terms.data) return;
    onAccepted({ version: terms.data.version, locale: termsLocale(terms.data.locale) });
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
          <TermsChecklist terms={terms.data} kind={kind} accepted={accepted} onToggle={toggle} idPrefix={`terms-${kind}`} />
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
