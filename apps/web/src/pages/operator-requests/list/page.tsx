import type { OperatorRequestAdmin } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { DataTable } from "@mtt/ui/components/data-table";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { useQuery } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { Link, Navigate } from "@tanstack/react-router";
import { type ReactElement, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { useMe } from "@/features/auth/use-me";
import {
  OPERATOR_REQUEST_STATUSES,
  canDecideOperatorRequests,
  type OperatorRequestStatusFilter,
} from "@/features/operator-request/model";
import { operatorRequestRepository } from "@/features/operator-request/repository";
import {
  DecideOperatorRequestDialog,
  type OperatorRequestDecision,
} from "@/features/operator-request/ui/decide-operator-request-dialog";
import { OperatorRequestStatusChip } from "@/features/operator-request/ui/operator-request-status-chip";
import { useFormatters } from "@/hooks/use-formatters";
import { pageHeadingClass } from "@/lib/page-heading";
import { routes } from "@/router";

const col = legacyCreateColumnHelper<OperatorRequestAdmin>();

export function OperatorRequestsPage(): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const { me } = useMe();
  const allowed = canDecideOperatorRequests(me);
  const [status, setStatus] = useState<OperatorRequestStatusFilter>("pending");
  const requests = useQuery({ ...operatorRequestRepository.list({ query: { status } }), enabled: allowed });
  const [deciding, setDeciding] = useState<{ request: OperatorRequestAdmin; decision: OperatorRequestDecision } | null>(
    null,
  );
  const statusLabels: Record<OperatorRequestStatusFilter, string> = {
    pending: formatMessage({ id: "page.operatorRequests.filter.pending", defaultMessage: "Pending" }),
    approved: formatMessage({ id: "page.operatorRequests.filter.approved", defaultMessage: "Approved" }),
    rejected: formatMessage({ id: "page.operatorRequests.filter.rejected", defaultMessage: "Rejected" }),
    all: formatMessage({ id: "page.operatorRequests.filter.all", defaultMessage: "All" }),
  };

  const columns = useMemo(
    () => [
      col.accessor("owner_name", {
        header: formatMessage({ id: "page.operatorRequests.columns.requester", defaultMessage: "Requester" }),
        cell: (info) => (
          <span className="flex flex-col">
            <Link
              to={routes.operatorRequest}
              params={{ requestId: info.row.original.id }}
              className="rounded-full text-text-primary outline-none hover:text-accent-500 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            >
              {info.getValue()}
            </Link>
            <span className="text-caption-1-regular text-text-tertiary">{info.row.original.owner_email}</span>
          </span>
        ),
      }),
      col.accessor("reason", {
        header: formatMessage({ id: "page.operatorRequests.columns.reason", defaultMessage: "Reason" }),
        enableSorting: false,
        cell: (info) => <span className="line-clamp-2 max-w-md text-text-secondary">{info.getValue()}</span>,
      }),
      col.accessor("created_at", {
        header: formatMessage({ id: "page.operatorRequests.columns.requested", defaultMessage: "Requested" }),
        cell: (info) => <span className="text-text-secondary">{formatWhen(info.getValue())}</span>,
      }),
      col.accessor("status", {
        header: formatMessage({ id: "page.operatorRequests.columns.status", defaultMessage: "Status" }),
        cell: (info) => <OperatorRequestStatusChip status={info.getValue()} />,
      }),
      col.display({
        id: "actions",
        header: formatMessage({ id: "page.operatorRequests.columns.actions", defaultMessage: "Actions" }),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === "pending" ? (
            <div className="flex justify-start gap-2">
              <Button
                type="button"
                size="xs"
                onClick={() => setDeciding({ request: row.original, decision: "approve" })}
              >
                {formatMessage({ id: "page.operatorRequests.approve", defaultMessage: "Approve" })}
              </Button>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                onClick={() => setDeciding({ request: row.original, decision: "reject" })}
              >
                {formatMessage({ id: "page.operatorRequests.reject", defaultMessage: "Reject" })}
              </Button>
            </div>
          ) : null,
      }),
    ],
    [formatMessage, formatWhen],
  );

  if (me && !allowed) return <Navigate to={routes.meshes} replace />;

  return (
    <>
      <div className={pageHeadingClass}>
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">
          {formatMessage({ id: "page.operatorRequests.title", defaultMessage: "Operator requests" })}
        </h1>
      </div>
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle>
            {formatMessage({ id: "page.operatorRequests.panel.title", defaultMessage: "Requests for the operator role" })}
          </FrameTitle>
          <FrameDescription>
            {requests.error
              ? formatMessage({
                  id: "page.operatorRequests.panel.error",
                  defaultMessage: "Requests didn't load. Check your connection and try again.",
                })
              : formatMessage({
                  id: "page.operatorRequests.panel.description",
                  defaultMessage: "Operators can bridge other brokers in as sources. Approving grants the role at once.",
                })}
          </FrameDescription>
        </FrameHeader>
        <FramePanel>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={formatMessage({ id: "page.operatorRequests.filter.label", defaultMessage: "Status" })}>
            {OPERATOR_REQUEST_STATUSES.map((value) => (
              <Button
                key={value}
                type="button"
                size="xs"
                variant={status === value ? "primary" : "secondary"}
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
              >
                {statusLabels[value]}
              </Button>
            ))}
          </div>
          {requests.isPending ? <SkeletonRows /> : null}
          {requests.error || requests.isPending ? null : (
            <DataTable
              data={requests.data}
              columns={columns}
              getRowId={(row) => row.id}
              previousPageLabel={formatMessage({ id: "common.dataTable.previousPage", defaultMessage: "Previous page" })}
              nextPageLabel={formatMessage({ id: "common.dataTable.nextPage", defaultMessage: "Next page" })}
              pageRangeOfLabel={formatMessage({ id: "common.dataTable.of", defaultMessage: "of" })}
              empty={
                status === "pending"
                  ? formatMessage({ id: "page.operatorRequests.empty.pending", defaultMessage: "No requests waiting." })
                  : formatMessage({ id: "page.operatorRequests.empty.other", defaultMessage: "No requests here." })
              }
            />
          )}
        </FramePanel>
      </Frame>
      <DecideOperatorRequestDialog
        request={deciding?.request ?? null}
        decision={deciding?.decision ?? "approve"}
        onClose={() => setDeciding(null)}
      />
    </>
  );
}
