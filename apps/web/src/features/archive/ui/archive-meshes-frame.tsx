import { Button } from "@mtt/ui/components/base/buttons/button";
import { DataTable } from "@mtt/ui/components/data-table";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";
import { type ReactElement, useMemo } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { formatBytes, type ArchiveSummary } from "@/features/archive/model";

export type ArchiveMeshRow = {
  id: string;
  title: string;
  devices: number;
  archived: number;
  /** Null while the mesh's file list loads or if it failed. */
  summary: ArchiveSummary | null;
};

export type ArchiveMeshesFrameProps = {
  rows: ArchiveMeshRow[];
  pending: boolean;
  selectedId: string | null;
  onSelect: (meshId: string) => void;
};

const col = legacyCreateColumnHelper<ArchiveMeshRow>();

/** One line per mesh: how many of its devices are archived and what's stored so far. */
export function ArchiveMeshesFrame({ rows, pending, selectedId, onSelect }: ArchiveMeshesFrameProps): ReactElement {
  const { formatMessage, locale } = useIntl();
  const dash = formatMessage({ id: "common.format.emDash", defaultMessage: "—" });

  const columns = useMemo(
    () => [
      col.accessor("title", {
        header: formatMessage({ id: "feature.archive.meshes.columns.mesh", defaultMessage: "Mesh" }),
        cell: (info) => <span className="text-text-primary">{info.getValue()}</span>,
      }),
      col.accessor("archived", {
        header: formatMessage({ id: "feature.archive.meshes.columns.archived", defaultMessage: "Devices in S3" }),
        cell: (info) => (
          <span className="tabular-nums text-text-secondary">
            {formatMessage(
              { id: "feature.archive.meshes.archivedOf", defaultMessage: "{archived} of {devices}" },
              { archived: info.getValue(), devices: info.row.original.devices },
            )}
          </span>
        ),
      }),
      col.accessor((row) => row.summary?.files ?? -1, {
        id: "files",
        header: formatMessage({ id: "feature.archive.meshes.columns.files", defaultMessage: "Files" }),
        cell: (info) => (
          <span className="tabular-nums text-text-secondary">{info.row.original.summary?.files ?? dash}</span>
        ),
      }),
      col.accessor((row) => row.summary?.bytes ?? -1, {
        id: "size",
        header: formatMessage({ id: "feature.archive.meshes.columns.size", defaultMessage: "Size" }),
        cell: (info) => {
          const summary = info.row.original.summary;
          return <span className="tabular-nums text-text-secondary">{summary ? formatBytes(summary.bytes, locale) : dash}</span>;
        },
      }),
      col.accessor((row) => row.summary?.last ?? "", {
        id: "last",
        header: formatMessage({ id: "feature.archive.meshes.columns.last", defaultMessage: "Latest hour (UTC)" }),
        cell: (info) => <span className="tabular-nums text-text-secondary">{info.row.original.summary?.last ?? dash}</span>,
      }),
      col.display({
        id: "select",
        header: formatMessage({ id: "feature.archive.meshes.columns.actions", defaultMessage: "Actions" }),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.id === selectedId ? (
            <span className="text-caption-1-medium text-text-tertiary">
              {formatMessage({ id: "feature.archive.meshes.showing", defaultMessage: "Showing below" })}
            </span>
          ) : (
            <Button type="button" size="xs" variant="secondary" onClick={() => onSelect(row.original.id)}>
              {formatMessage({ id: "feature.archive.meshes.show", defaultMessage: "Show" })}
            </Button>
          ),
      }),
    ],
    [formatMessage, locale, dash, selectedId, onSelect],
  );

  return (
    <Frame className="shadow-card">
      <FrameHeader>
        <FrameTitle>{formatMessage({ id: "feature.archive.meshes.title", defaultMessage: "Meshes" })}</FrameTitle>
        <FrameDescription>
          {formatMessage({
            id: "feature.archive.meshes.description",
            defaultMessage: "Select a mesh below to see the data from its archive.",
          })}
        </FrameDescription>
      </FrameHeader>
      <FramePanel>
        {pending ? (
          <SkeletonRows />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(row) => row.id}
            previousPageLabel={formatMessage({ id: "common.dataTable.previousPage", defaultMessage: "Previous page" })}
            nextPageLabel={formatMessage({ id: "common.dataTable.nextPage", defaultMessage: "Next page" })}
            pageRangeOfLabel={formatMessage({ id: "common.dataTable.of", defaultMessage: "of" })}
            empty={formatMessage({
              id: "feature.archive.meshes.empty",
              defaultMessage: "No meshes yet. Create a mesh and register its devices to archive them.",
            })}
          />
        )}
      </FramePanel>
    </Frame>
  );
}
