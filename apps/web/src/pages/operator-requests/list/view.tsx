import type { OperatorRequestAdmin } from "@mtt/contracts";
import { DataTable } from "@mtt/ui/components/data-table";
import { useQuery } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { Link } from "@tanstack/react-router";
import { type ReactElement, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { ListScaffold } from "@/components/list-scaffold";
import { StatusFilter } from "@/components/status-filter";
import {
  OPERATOR_REQUEST_STATUSES,
  type OperatorRequestStatusFilter,
} from "@/features/operator-request/model";
import { operatorRequestRepository } from "@/features/operator-request/repository";
import { useOperatorRequestStatusLabels } from "@/features/operator-request/use-status-labels";
import { DecideButtons } from "@/features/operator-request/ui/decide-buttons";
import { OperatorRequestStatusChip } from "@/features/operator-request/ui/operator-request-status-chip";
import { useFormatters } from "@/hooks/use-formatters";
import { tableLinkClass } from "@/lib/link-class";
import { routes } from "@/router";

const col = legacyCreateColumnHelper<OperatorRequestAdmin>();

export function OperatorRequestsView(): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const [status, setStatus] = useState<OperatorRequestStatusFilter>("pending");
  const requests = useQuery(operatorRequestRepository.list({ status }));
  const statusLabels = useOperatorRequestStatusLabels();

  const columns = useMemo(
    () => [
      col.accessor("owner_name", {
        header: formatMessage({ id: "page.operatorRequests.columns.requester", defaultMessage: "Requester" }),
        cell: (info) => (
          <span className="flex flex-col">
            <Link
              to={routes.operatorRequest}
              params={{ requestId: info.row.original.id }}
              className={tableLinkClass}
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
              <DecideButtons request={row.original} size="xs" />
            </div>
          ) : null,
      }),
    ],
    [formatMessage, formatWhen],
  );

  return (
    <>
      <ListScaffold
        title={formatMessage({ id: "page.operatorRequests.title", defaultMessage: "Operator requests" })}
        panelTitle={formatMessage({ id: "page.operatorRequests.panel.title", defaultMessage: "Requests for the operator role" })}
        panelDescription={
          requests.error
            ? formatMessage({
                id: "page.operatorRequests.panel.error",
                defaultMessage: "Requests didn't load. Check your connection and try again.",
              })
            : formatMessage({
                id: "page.operatorRequests.panel.description",
                defaultMessage: "Operators can bridge other brokers in as sources. Approving grants the role at once.",
              })
        }
        toolbar={
          <StatusFilter statuses={OPERATOR_REQUEST_STATUSES} value={status} labels={statusLabels} onChange={setStatus} />
        }
        pending={requests.isPending}
        failed={Boolean(requests.error)}
      >
        <DataTable
          data={requests.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          empty={
            status === "pending"
              ? formatMessage({ id: "page.operatorRequests.empty.pending", defaultMessage: "No requests waiting." })
              : formatMessage({ id: "page.operatorRequests.empty.other", defaultMessage: "No requests here." })
          }
        />
      </ListScaffold>
    </>
  );
}
