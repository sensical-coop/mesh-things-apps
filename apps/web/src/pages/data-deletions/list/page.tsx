import type { DataDeletion } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { DataTable } from "@mtt/ui/components/data-table";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { useQuery } from "@tanstack/react-query";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { Link, Navigate } from "@tanstack/react-router";
import { type ReactElement, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { useOwnerDirectory } from "@/features/auth/use-owner-directory";
import {
  DATA_DELETION_STATUSES,
  canSeeDataDeletions,
  isOverdue,
  type DataDeletionStatusFilter,
} from "@/features/data-deletion/model";
import { dataDeletionRepository } from "@/features/data-deletion/repository";
import { DataDeletionStatusChip } from "@/features/data-deletion/ui/data-deletion-status-chip";
import { meshTitle } from "@/features/mesh/model";
import { meshRepository } from "@/features/mesh/repository";
import { sourceTitle } from "@/features/source/model";
import { sourceRepository } from "@/features/source/repository";
import { useFormatters } from "@/hooks/use-formatters";
import { pageHeadingClass } from "@/lib/page-heading";
import { routes } from "@/router";

const col = legacyCreateColumnHelper<DataDeletion>();

/** Superusers: whose stored readings are due for deletion, why, and whether it worked. */
export function DataDeletionsPage(): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const { me, ownerName } = useOwnerDirectory();
  const allowed = canSeeDataDeletions(me);
  const [status, setStatus] = useState<DataDeletionStatusFilter>("pending");
  const deletions = useQuery({ ...dataDeletionRepository.list({ query: { status } }), enabled: allowed });
  // Names for meshes and sources that still exist; a deleted mesh shows its id.
  const meshes = useQuery({ ...meshRepository.list(), enabled: allowed });
  const sources = useQuery({ ...sourceRepository.list(), enabled: allowed });
  const meshById = useMemo(() => new Map((meshes.data ?? []).map((mesh) => [mesh.id, mesh])), [meshes.data]);
  const sourceById = useMemo(() => new Map((sources.data ?? []).map((source) => [source.id, source])), [sources.data]);

  const statusLabels: Record<DataDeletionStatusFilter, string> = {
    pending: formatMessage({ id: "page.dataDeletions.filter.pending", defaultMessage: "Scheduled" }),
    done: formatMessage({ id: "page.dataDeletions.filter.done", defaultMessage: "Deleted" }),
    cancelled: formatMessage({ id: "page.dataDeletions.filter.cancelled", defaultMessage: "Cancelled" }),
    all: formatMessage({ id: "page.dataDeletions.filter.all", defaultMessage: "All" }),
  };
  const reasonLabels = useMemo<Record<DataDeletion["reason"], string>>(
    () => ({
    mesh_deleted: formatMessage({ id: "page.dataDeletions.reason.meshDeleted", defaultMessage: "Mesh deleted" }),
    source_detached: formatMessage({
      id: "page.dataDeletions.reason.sourceDetached",
      defaultMessage: "Moved off its source",
    }),
    terms_lapsed: formatMessage({ id: "page.dataDeletions.reason.termsLapsed", defaultMessage: "Terms lapsed" }),
    }),
    [formatMessage],
  );

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
              className="rounded-full text-text-primary outline-none hover:text-accent-500 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
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

  if (me && !allowed) return <Navigate to={routes.meshes} replace />;

  return (
    <>
      <div className={pageHeadingClass}>
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">
          {formatMessage({ id: "page.dataDeletions.title", defaultMessage: "Scheduled deletions" })}
        </h1>
      </div>
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle>
            {formatMessage({ id: "page.dataDeletions.panel.title", defaultMessage: "Stored readings due for deletion" })}
          </FrameTitle>
          <FrameDescription>
            {deletions.error
              ? formatMessage({
                  id: "page.dataDeletions.panel.error",
                  defaultMessage: "Deletions didn't load. Check your connection to the API and try again.",
                })
              : formatMessage({
                  id: "page.dataDeletions.panel.description",
                  defaultMessage:
                    "A mesh's readings are scheduled for deletion when the mesh is deleted, moved off its source, or its terms lapse. They stay readable until the date shown, then are deleted from the time-series store and the archive. Renewing, or moving a mesh back, cancels the scheduled deletion.",
                })}
          </FrameDescription>
        </FrameHeader>
        <FramePanel>
          <div
            className="mb-4 flex flex-wrap gap-2"
            role="group"
            aria-label={formatMessage({ id: "page.dataDeletions.filter.label", defaultMessage: "Status" })}
          >
            {DATA_DELETION_STATUSES.map((value) => (
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
          {deletions.isPending ? <SkeletonRows /> : null}
          {deletions.error || deletions.isPending ? null : (
            <DataTable
              data={deletions.data}
              columns={columns}
              getRowId={(row) => row.id}
              previousPageLabel={formatMessage({ id: "common.dataTable.previousPage", defaultMessage: "Previous page" })}
              nextPageLabel={formatMessage({ id: "common.dataTable.nextPage", defaultMessage: "Next page" })}
              pageRangeOfLabel={formatMessage({ id: "common.dataTable.of", defaultMessage: "of" })}
              empty={
                status === "pending"
                  ? formatMessage({ id: "page.dataDeletions.empty.pending", defaultMessage: "Nothing scheduled." })
                  : formatMessage({ id: "page.dataDeletions.empty.other", defaultMessage: "No deletions here." })
              }
            />
          )}
        </FramePanel>
      </Frame>
    </>
  );
}
