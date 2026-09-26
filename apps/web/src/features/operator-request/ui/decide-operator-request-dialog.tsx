import type { OperatorRequestAdmin } from "@mtt/contracts";
import { zOperatorRequestsUpdateData } from "@mtt/contracts/zod";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Textarea } from "@mtt/ui/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { Modal } from "@/components/modal";
import { StatusCopy } from "@/components/status-copy";
import { formLevelMessage, issueErrors, readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { authRepository } from "@/features/auth/repository";
import { operatorRequestRepository } from "@/features/operator-request/repository";

export type OperatorRequestDecision = "approve" | "reject";

export type DecideOperatorRequestDialogProps = {
  request: Pick<OperatorRequestAdmin, "id" | "owner_name" | "owner_email" | "reason"> | null;
  decision: OperatorRequestDecision;
  onClose: () => void;
};

/** Approving makes the requester an operator; either way they're emailed the note. */
export function DecideOperatorRequestDialog({
  request,
  decision,
  onClose,
}: DecideOperatorRequestDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const decide = useMutation({
    ...operatorRequestRepository.decide(),
    onSuccess: async (decided) => {
      await queryClient.invalidateQueries({ queryKey: operatorRequestRepository.listKey() });
      await queryClient.invalidateQueries({
        queryKey: operatorRequestRepository.retrieveKey({ path: { request_id: decided.id } }),
      });
      // The requester's role changed; the owner directory shows it.
      await queryClient.invalidateQueries({ queryKey: authRepository.listKey() });
      close();
    },
    onError: (error) => setErrors(readApiError(error).fields),
  });
  const approving = decision === "approve";
  const conflict = decide.error ? readApiError(decide.error).status === 409 : false;

  function close() {
    setErrors({});
    decide.reset();
    onClose();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request) return;
    const form = new FormData(event.currentTarget);
    const parsed = zOperatorRequestsUpdateData.safeParse({
      path: { request_id: request.id },
      body: { decision, note: String(form.get("note") ?? "").trim() },
    });
    if (!parsed.success) {
      setErrors(issueErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    decide.mutate(parsed.data);
  }

  return (
    <Modal
      open={request !== null}
      title={
        approving
          ? formatMessage({ id: "feature.operatorRequest.decide.approveTitle", defaultMessage: "Approve operator request" })
          : formatMessage({ id: "feature.operatorRequest.decide.rejectTitle", defaultMessage: "Reject operator request" })
      }
      description={
        request
          ? approving
            ? formatMessage(
                {
                  id: "feature.operatorRequest.decide.approveDescription",
                  defaultMessage:
                    "{name} ({email}) becomes an operator and can add sources. They're emailed your note.",
                },
                { name: request.owner_name, email: request.owner_email },
              )
            : formatMessage(
                {
                  id: "feature.operatorRequest.decide.rejectDescription",
                  defaultMessage: "{name} ({email}) stays a member and is emailed your note. They can ask again later.",
                },
                { name: request.owner_name, email: request.owner_email },
              )
          : ""
      }
      onClose={close}
    >
      <form key={request?.id ?? "none"} className="flex flex-col gap-5" onSubmit={onSubmit}>
        {request ? (
          <blockquote className="border-l-2 border-separator-border pl-3 text-body-regular text-text-secondary">
            {request.reason}
          </blockquote>
        ) : null}
        <FieldGroup>
          <FormField
            id="operator-request-note"
            label={formatMessage({ id: "feature.operatorRequest.decide.note", defaultMessage: "Note to the requester" })}
            hint={formatMessage({
              id: "feature.operatorRequest.decide.noteHint",
              defaultMessage: "Optional. Included in the email.",
            })}
            error={errors.note}
          >
            <Textarea id="operator-request-note" name="note" maxLength={2000} />
          </FormField>
        </FieldGroup>
        {decide.error ? (
          <StatusCopy>
            {conflict
              ? formatMessage({
                  id: "feature.operatorRequest.decide.conflict",
                  defaultMessage: "Someone already decided this request. Close and refresh the list.",
                })
              : formatMessage({
                  id: "feature.operatorRequest.decide.error",
                  defaultMessage: "The decision was not saved. Try again.",
                })}
            {!conflict && formLevelMessage(decide.error) ? ` ${formLevelMessage(decide.error)}` : ""}
          </StatusCopy>
        ) : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={close}>
            {formatMessage({ id: "feature.operatorRequest.decide.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button type="submit" size="small" variant={approving ? "primary" : "danger"} disabled={decide.isPending}>
            {decide.isPending
              ? formatMessage({ id: "feature.operatorRequest.decide.saving", defaultMessage: "Saving" })
              : approving
                ? formatMessage({ id: "feature.operatorRequest.decide.approve", defaultMessage: "Approve and make operator" })
                : formatMessage({ id: "feature.operatorRequest.decide.reject", defaultMessage: "Reject request" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
