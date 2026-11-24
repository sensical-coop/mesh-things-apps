import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { useQuery } from "@tanstack/react-query";
import { Link, notFound, useParams } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import { operatorRequestRepository } from "@/features/operator-request/repository";
import { DecideButtons } from "@/features/operator-request/ui/decide-buttons";
import { OperatorRequestStatusChip } from "@/features/operator-request/ui/operator-request-status-chip";
import { useFormatters } from "@/hooks/use-formatters";
import { isNotFoundError } from "@/lib/not-found";
import { DetailHeading } from "@/components/detail-heading";
import { routes } from "@/router";

/** The page the "operator role requested" email links to. Superusers only. */
export function OperatorRequestView(): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const { ownerName } = useOwnerDirectory();
  const { requestId } = useParams({ from: routes.operatorRequest });
  const request = useQuery(operatorRequestRepository.retrieve(requestId));
  if (isNotFoundError(request.error)) throw notFound();

  const row = request.data;
  return (
    <>
      <DetailHeading
        crumb={
          <Link to={routes.operatorRequests}>
            {formatMessage({ id: "page.operatorRequest.breadcrumb", defaultMessage: "Operator requests" })}
          </Link>
        }
        title={
          row?.owner_name ?? formatMessage({ id: "page.operatorRequest.fallbackTitle", defaultMessage: "Operator request" })
        }
        badges={row ? <OperatorRequestStatusChip status={row.status} /> : null}
        actions={row?.status === "pending" ? <DecideButtons request={row} size="small" /> : null}
      />
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
    </>
  );
}
