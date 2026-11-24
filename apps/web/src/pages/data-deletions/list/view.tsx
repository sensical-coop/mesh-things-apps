import type { DataDeletion } from "@mtt/contracts";
import { DataTable } from "@mtt/ui/components/data-table";
import { useQuery } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { Link } from "@tanstack/react-router";
import { type ReactElement, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { ListScaffold } from "@/components/list-scaffold";
import { StatusFilter } from "@/components/status-filter";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import {
  DATA_DELETION_STATUSES,
  isOverdue,
  type DataDeletionStatusFilter,
} from "@/features/data-deletion/model";
import { dataDeletionRepository } from "@/features/data-deletion/repository";
import { useDataDeletionReasonLabels } from "@/features/data-deletion/use-reason-labels";
import { useDataDeletionStatusLabels } from "@/features/data-deletion/use-status-labels";
import { DataDeletionStatusChip } from "@/features/data-deletion/ui/data-deletion-status-chip";
import { meshTitle } from "@/features/mesh/model";
import { useMeshDirectory } from "@/features/mesh/use-mesh-directory";
import { sourceTitle } from "@/features/source/model";
import { sourceRepository } from "@/features/source/repository";
import { useFormatters } from "@/hooks/use-formatters";
import { tableLinkClass } from "@/lib/link-class";
import { routes } from "@/router";

const col = legacyCreateColumnHelper<DataDeletion>();

export function DataDeletionsView(): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const { ownerName } = useOwnerDirectory();
  const [status, setStatus] = useState<DataDeletionStatusFilter>("pending");
  const deletions = useQuery(dataDeletionRepository.list({ status }));
  // Names for meshes and sources that still exist; a deleted mesh shows its id.
  const sources = useQuery(sourceRepository.list());
  const { byId: meshById } = useMeshDirectory();
  const sourceById = useMemo(() => new Map((sources.data ?? []).map((source) => [source.id, source])), [sources.data]);

  const statusLabels = useDataDeletionStatusLabels();
  const reasonLabels = useDataDeletionReasonLabels();

  const columns = useMemo(
    () => [
      col.accessor("mesh_id", {
        header: formatMessage({ id: "page.dataDeletions.columns.mesh", defaultMessage: "Mesh" }),
        cell: (info) => {
          const mesh = meshById.get(info.getValue());
          return mesh ? (
            <Link
              to={routes.mesh}
              params={{ meshId: mesh.id }}
              className={tableLinkClass}
            >
              {meshTitle(mesh)}
            </Link>
          ) : (
            <span className="flex flex-col">
              <span className="text-text-secondary">
                {formatMessage({ id: "page.dataDeletions.deletedMesh", defaultMessage: "Deleted mesh" })}
              </span>
              <span className="font-mono text-caption-1-regular text-text-tertiary">{info.getValue().slice(0, 8)}</span>
            </span>
          );
        },
      }),
      col.accessor("reason", {
        header: formatMessage({ id: "page.dataDeletions.columns.reason", defaultMessage: "Why" }),
        cell: (info) => {
          const source = info.row.original.source_id ? sourceById.get(info.row.original.source_id) : undefined;
          return (
            <span className="flex flex-col">
              <span className="text-text-primary">{reasonLabels[info.getValue()]}</span>
              {info.row.original.source_id ? (
                <span className="text-caption-1-regular text-text-tertiary">
                  {source
                    ? sourceTitle(source)
                    : formatMessage({ id: "page.dataDeletions.deletedSource", defaultMessage: "Deleted source" })}
                </span>
              ) : null}
            </span>
          );
        },
      }),
      col.accessor("requested_at", {
        header: formatMessage({ id: "page.dataDeletions.columns.requested", defaultMessage: "Requested" }),
        cell: (info) => (
          <span className="flex flex-col">
            <span className="text-text-secondary">{formatWhen(info.getValue())}</span>
            <span className="text-caption-1-regular text-text-tertiary">
              {info.row.original.requested_by_id
                ? ownerName(info.row.original.requested_by_id)
                : formatMessage({ id: "page.dataDeletions.bySystem", defaultMessage: "Automatic" })}
            </span>
          </span>
        ),
      }),
      col.accessor("delete_after", {
        header: formatMessage({ id: "page.dataDeletions.columns.deleteAfter", defaultMessage: "Deleted from" }),
        cell: (info) => <span className="text-text-secondary">{formatWhen(info.getValue())}</span>,
      }),
      col.accessor("data_until", {
        header: formatMessage({ id: "page.dataDeletions.columns.dataUntil", defaultMessage: "Readings" }),
        cell: (info) => (
          <span className="text-text-secondary">
            {info.getValue()
              ? formatMessage(
                  { id: "page.dataDeletions.dataUntil", defaultMessage: "Up to {when}" },
                  { when: formatWhen(info.getValue()) },
                )
              : formatMessage({ id: "page.dataDeletions.allData", defaultMessage: "All" })}
          </span>
        ),
      }),
      col.accessor("status", {
        header: formatMessage({ id: "page.dataDeletions.columns.status", defaultMessage: "Status" }),
        cell: (info) => {
          const row = info.row.original;
          return (
            <span className="flex flex-col items-start gap-1">
              <DataDeletionStatusChip status={row.status} overdue={isOverdue(row, new Date())} />
              {row.completed_at ? (
                <span className="text-caption-1-regular text-text-tertiary">{formatWhen(row.completed_at)}</span>
              ) : null}
              {row.attempts > 0 && row.status === "pending" ? (
                <span className="max-w-xs text-caption-1-regular text-text-tertiary">
                  {formatMessage(
                    {
                      id: "page.dataDeletions.attempts",
                      defaultMessage: "{count, plural, one {# failed attempt} other {# failed attempts}}",
                    },
                    { count: row.attempts },
                  )}
                  {row.last_error ? `: ${row.last_error}` : ""}
                </span>
              ) : null}
            </span>
          );
        },
      }),
    ],
    [formatMessage, formatWhen, meshById, sourceById, ownerName, reasonLabels],
  );

  return (
    <>
      <ListScaffold
        title={formatMessage({ id: "page.dataDeletions.title", defaultMessage: "Scheduled deletions" })}
        panelTitle={formatMessage({ id: "page.dataDeletions.panel.title", defaultMessage: "Stored readings due for deletion" })}
        panelDescription={
          deletions.error
            ? formatMessage({
                id: "page.dataDeletions.panel.error",
                defaultMessage: "Deletions didn't load. Check your connection to the API and try again.",
              })
            : formatMessage({
                id: "page.dataDeletions.panel.description",
                defaultMessage:
                  "A mesh's readings are scheduled for deletion when the mesh is deleted, moved off its source, or its terms lapse. They stay readable until the date shown, then are deleted from the time-series store and the archive. Renewing, or moving a mesh back, cancels the scheduled deletion.",
              })
        }
        toolbar={
          <StatusFilter statuses={DATA_DELETION_STATUSES} value={status} labels={statusLabels} onChange={setStatus} />
        }
        pending={deletions.isPending}
        failed={Boolean(deletions.error)}
      >
        <DataTable
          data={deletions.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          empty={
            status === "pending"
              ? formatMessage({ id: "page.dataDeletions.empty.pending", defaultMessage: "Nothing scheduled." })
              : formatMessage({ id: "page.dataDeletions.empty.other", defaultMessage: "No deletions here." })
          }
        />
      </ListScaffold>
    </>
  );
}
