import { zOwnersMeOperatorRequestCreateData } from "@mtt/contracts/zod";
import { Button, ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { Textarea } from "@mtt/ui/components/ui/textarea";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { FormField } from "@/components/form/form-field";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { authRepository } from "@/features/auth/repository";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { canRequestOperator } from "@/features/operator-request/model";
import { operatorRequestRepository } from "@/features/operator-request/repository";
import { OperatorRequestStatusChip } from "@/features/operator-request/ui/operator-request-status-chip";
import { useFormatters } from "@/hooks/use-formatters";
import { formLevelMessage, issueErrors, readApiError } from "@/lib/api-errors";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { routes } from "@/router";

/**
 * The profile's "Operator role" panel: operators get a way to their sources,
 * members ask for the role and follow their request. Staff see nothing.
 */
export function OperatorRolePanel(): ReactElement | null {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const queryClient = useQueryClient();
  const { me, isOperator } = useOwnerDirectory();
  const canRequest = canRequestOperator(me);
  // 404 means "never asked", so don't retry it.
  // While pending, check back now and then, so an approval shows up without a reload.
  const mine = useQuery({
    ...operatorRequestRepository.mine(),
    enabled: canRequest,
    retry: false,
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 30_000 : false),
  });
  const approved = mine.data?.status === "approved";
  useEffect(() => {
    // Approved: the role changed, so refresh `me` and the Sources tab appears.
    if (approved && !isOperator) void queryClient.invalidateQueries({ queryKey: authRepository.meKey() });
  }, [approved, isOperator, queryClient]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useMutation({
    ...operatorRequestRepository.create(),
    onSuccess: async () => {
      setErrors({});
      await queryClient.invalidateQueries({ queryKey: operatorRequestRepository.mineKey() });
    },
    onError: (error) => setErrors(readApiError(error).fields),
  });

  if (!me || (!isOperator && !canRequest)) return null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = zOwnersMeOperatorRequestCreateData.safeParse({
      body: { reason: String(form.get("reason") ?? "").trim() },
    });
    if (!parsed.success || parsed.data.body.reason === "") {
      setErrors(
        parsed.success
          ? {
              reason: formatMessage({
                id: "feature.operatorRequest.panel.reasonRequired",
                defaultMessage: "Say why you need the operator role.",
              }),
            }
          : issueErrors(parsed.error.issues),
      );
      return;
    }
    setErrors({});
    create.mutate({ body: parsed.data.body });
  }

  const request = mine.data;
  const neverAsked = mine.error ? readApiError(mine.error).status === 404 : false;
  const canAskAgain = neverAsked || request?.status === "rejected";
  const createStatus = create.error ? readApiError(create.error).status : undefined;

  return (
    <Frame className="shadow-card">
      <FrameHeader>
        <FrameTitle>{formatMessage({ id: "feature.operatorRequest.panel.title", defaultMessage: "Operator role" })}</FrameTitle>
        <FrameDescription>
          {isOperator
            ? formatMessage({
                id: "feature.operatorRequest.panel.operatorDescription",
                defaultMessage: "You're an operator: you can bridge other MQTT brokers into this platform as sources.",
              })
            : formatMessage({
                id: "feature.operatorRequest.panel.memberDescription",
                defaultMessage:
                  "Operators can bridge other MQTT brokers into this platform as sources. A superuser reviews each request.",
              })}
        </FrameDescription>
      </FrameHeader>
      <FramePanel>
        {isOperator ? (
          <ButtonLink href={routes.sources} size="small" variant="secondary">
            {formatMessage({ id: "feature.operatorRequest.panel.openSources", defaultMessage: "Open sources" })}
          </ButtonLink>
        ) : mine.isPending ? (
          <SkeletonRows />
        ) : (
          <div className="flex max-w-md flex-col gap-5">
            {request ? (
              <div className="flex flex-col gap-2">
                <p className="flex flex-wrap items-center gap-2 text-body-regular text-text-primary">
                  {formatMessage(
                    { id: "feature.operatorRequest.panel.lastRequest", defaultMessage: "Your request from {when}" },
                    { when: formatWhen(request.created_at) },
                  )}
                  <OperatorRequestStatusChip status={request.status} />
                </p>
                {request.status === "pending" ? (
                  <StatusCopy>
                    {formatMessage({
                      id: "feature.operatorRequest.panel.pending",
                      defaultMessage: "A superuser will review it. You'll get an email with the decision.",
                    })}
                  </StatusCopy>
                ) : null}
                {request.decision_note ? (
                  <StatusCopy>
                    {formatMessage(
                      { id: "feature.operatorRequest.panel.note", defaultMessage: "Note: {note}" },
                      { note: request.decision_note },
                    )}
                  </StatusCopy>
                ) : null}
              </div>
            ) : null}
            {mine.error && !neverAsked ? (
              <StatusCopy>
                {formatMessage({
                  id: "feature.operatorRequest.panel.loadError",
                  defaultMessage: "Your request didn't load. Try again.",
                })}
              </StatusCopy>
            ) : null}
            {canAskAgain ? (
              <form className="flex flex-col gap-5" onSubmit={onSubmit}>
                <FieldGroup>
                  <FormField
                    id="operator-request-reason"
                    label={formatMessage({
                      id: "feature.operatorRequest.panel.reason",
                      defaultMessage: "Why do you need it?",
                    })}
                    hint={formatMessage({
                      id: "feature.operatorRequest.panel.reasonHint",
                      defaultMessage: "Which broker and channel you want to bridge, and for which community. Shown to superusers.",
                    })}
                    error={errors.reason}
                  >
                    <Textarea id="operator-request-reason" name="reason" required maxLength={2000} />
                  </FormField>
                </FieldGroup>
                {create.error && !errors.reason ? (
                  <StatusCopy>
                    {createStatus === 429
                      ? formatMessage({
                          id: "feature.operatorRequest.panel.throttled",
                          defaultMessage: "Too many requests today. Try again tomorrow.",
                        })
                      : formLevelMessage(create.error) ??
                        formatMessage({
                          id: "feature.operatorRequest.panel.error",
                          defaultMessage: "The request was not sent. Try again.",
                        })}
                  </StatusCopy>
                ) : null}
                <div className={dialogActionsClass}>
                  <Button type="submit" size="small" disabled={create.isPending}>
                    {create.isPending
                      ? formatMessage({ id: "feature.operatorRequest.panel.sending", defaultMessage: "Sending request" })
                      : formatMessage({ id: "feature.operatorRequest.panel.submit", defaultMessage: "Request operator role" })}
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        )}
      </FramePanel>
    </Frame>
  );
}
