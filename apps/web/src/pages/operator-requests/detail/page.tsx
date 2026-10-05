import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, notFound, useParams } from "@tanstack/react-router";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { canDecideOperatorRequests } from "@/features/operator-request/model";
import { operatorRequestRepository } from "@/features/operator-request/repository";
import {
  DecideOperatorRequestDialog,
  type OperatorRequestDecision,
} from "@/features/operator-request/ui/decide-operator-request-dialog";
import { OperatorRequestStatusChip } from "@/features/operator-request/ui/operator-request-status-chip";
import { useFormatters } from "@/hooks/use-formatters";
import { isNotFoundError } from "@/lib/not-found";
import { pageHeadingClass } from "@/lib/page-heading";
import { routes } from "@/router";

/** The page the "operator role requested" email links to. Superusers only. */
export function OperatorRequestPage(): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const { me, ownerName } = useOwnerDirectory();
  const allowed = canDecideOperatorRequests(me);
  const { requestId } = useParams({ from: routes.operatorRequest });
  const request = useQuery({
    ...operatorRequestRepository.retrieve({ path: { request_id: requestId } }),
    enabled: allowed,
  });
  if (isNotFoundError(request.error)) throw notFound();
  const [decision, setDecision] = useState<OperatorRequestDecision | null>(null);

  if (me && !allowed) return <Navigate to={routes.meshes} replace />;

  const row = request.data;
  return (
    <>
      <div className={pageHeadingClass}>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-caption-1-regular text-text-secondary">
            <Link to={routes.operatorRequests} className="hover:text-text-primary">
              {formatMessage({ id: "page.operatorRequest.breadcrumb", defaultMessage: "Operator requests" })}
            </Link>
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-words text-title-2-medium tracking-tight text-text-primary">
              {row?.owner_name ??
                formatMessage({ id: "page.operatorRequest.fallbackTitle", defaultMessage: "Operator request" })}
            </h1>
            {row ? <OperatorRequestStatusChip status={row.status} /> : null}
          </div>
        </div>
        {row?.status === "pending" ? (
          <div className="flex gap-2">
            <Button type="button" size="small" variant="secondary" onClick={() => setDecision("reject")}>
              {formatMessage({ id: "page.operatorRequest.reject", defaultMessage: "Reject" })}
            </Button>
            <Button type="button" size="small" onClick={() => setDecision("approve")}>
              {formatMessage({ id: "page.operatorRequest.approve", defaultMessage: "Approve" })}
            </Button>
          </div>
        ) : null}
      </div>
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle>{formatMessage({ id: "page.operatorRequest.panel.title", defaultMessage: "Request" })}</FrameTitle>
          <FrameDescription>
            {row
              ? formatMessage(
                  { id: "page.operatorRequest.panel.description", defaultMessage: "{email}, requested {when}." },
                  { email: row.owner_email, when: formatWhen(row.created_at) },
                )
              : ""}
          </FrameDescription>
        </FrameHeader>
        <FramePanel>
          {request.isPending ? <SkeletonRows /> : null}
          {request.error ? (
            <StatusCopy>
              {formatMessage({
                id: "page.operatorRequest.notFound",
                defaultMessage: "This request doesn't exist or didn't load.",
              })}
            </StatusCopy>
          ) : null}
          {row ? (
            <dl className="grid max-w-2xl gap-4 text-body-regular">
              <div>
                <dt className="text-caption-1-regular text-text-tertiary">
                  {formatMessage({ id: "page.operatorRequest.reason", defaultMessage: "Reason" })}
                </dt>
                <dd className="whitespace-pre-wrap text-text-primary">{row.reason}</dd>
              </div>
              {row.decided_at ? (
                <div>
                  <dt className="text-caption-1-regular text-text-tertiary">
                    {formatMessage({ id: "page.operatorRequest.decided", defaultMessage: "Decided" })}
                  </dt>
                  <dd className="text-text-primary">
                    {row.decided_by_id
                      ? formatMessage(
                          { id: "page.operatorRequest.decidedBy", defaultMessage: "{when} by {name}" },
                          { when: formatWhen(row.decided_at), name: ownerName(row.decided_by_id) },
                        )
                      : formatWhen(row.decided_at)}
                  </dd>
                </div>
              ) : null}
              {row.decision_note ? (
                <div>
                  <dt className="text-caption-1-regular text-text-tertiary">
                    {formatMessage({ id: "page.operatorRequest.note", defaultMessage: "Note to the requester" })}
                  </dt>
                  <dd className="whitespace-pre-wrap text-text-primary">{row.decision_note}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </FramePanel>
      </Frame>
      <DecideOperatorRequestDialog
        request={decision && row ? row : null}
        decision={decision ?? "approve"}
        onClose={() => setDecision(null)}
      />
    </>
  );
}
