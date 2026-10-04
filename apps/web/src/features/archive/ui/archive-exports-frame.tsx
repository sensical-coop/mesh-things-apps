import type { ArchiveManifest } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { RiFolderZipLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { EXPORT_MAX_DAYS, pollInterval, rangeProblem, requestOf, shiftDay } from "@/features/export/model";
import { exportRepository } from "@/features/export/repository";
import type { RequestExportState } from "@/features/export/use-request-export";
import { ExportLimits } from "@/features/export/ui/export-limits";
import { ExportRangeFields, type ExportRange } from "@/features/export/ui/export-range-fields";
import { ExportsTable } from "@/features/export/ui/exports-table";

export type ArchiveExportsFrameProps = {
  meshId: string;
  manifest: ArchiveManifest | undefined;
  requested: RequestExportState;
};

/** The whole archive, or its last EXPORT_MAX_DAYS days when it holds more. */
function wholeArchive(manifest: ArchiveManifest | undefined): ExportRange {
  const first = manifest?.partitions[0]?.dt ?? "";
  const last = manifest?.partitions.at(-1)?.dt ?? "";
  if (!first || !last) return { start: first, stop: last };
  const earliest = shiftDay(last, -(EXPORT_MAX_DAYS - 1));
  return { start: first < earliest ? earliest : first, stop: last };
}

/**
 * A range of the archive as one zip of its hourly files, prepared in the background,
 * and the mesh's Parquet exports so far.
 */
export function ArchiveExportsFrame({ meshId, manifest, requested }: ArchiveExportsFrameProps): ReactElement {
  const { formatMessage } = useIntl();
  const [range, setRange] = useState<ExportRange>(() => wholeArchive(manifest));
  const exports = useQuery({
    ...exportRepository.meshList({ path: { mesh_id: meshId } }),
    refetchInterval: (query) => pollInterval(query.state.data),
  });
  const rows = (exports.data ?? []).filter((row) => row.format === "parquet");
  const empty = manifest != null && manifest.partitions.length === 0;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rangeProblem(range.start, range.stop) === null) requested.request(meshId, { format: "parquet", ...range });
  }

  return (
    <Frame className="shadow-card" id="archive-exports">
      <FrameHeader>
        <FrameTitle>{formatMessage({ id: "feature.archive.exports.title", defaultMessage: "Exports" })}</FrameTitle>
        <FrameDescription>
          {formatMessage({
            id: "feature.archive.exports.description",
            defaultMessage:
              "Trigger a new export of a range of days. Each zip has a folder per day with a Parquet file per hour in it. Note: If you have already requested a certain period, and you want to request another one, use its calendar button below.",
          })}
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="flex flex-col gap-6">
        <ExportLimits />
        {empty ? (
          <StatusCopy>
            {formatMessage({
              id: "feature.archive.exports.nothing",
              defaultMessage: "Nothing to export yet. Files appear once a stored device reports.",
            })}
          </StatusCopy>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <ExportRangeFields
              idPrefix="archive-export"
              value={range}
              onChange={(next) => {
                requested.reset();
                setRange(next);
              }}
            />
            {requested.error ? <StatusCopy>{requested.error}</StatusCopy> : null}
            <div className="flex justify-end">
              <Button
                type="submit"
                size="small"
                leadingIcon={RiFolderZipLine}
                disabled={requested.pending || rangeProblem(range.start, range.stop) !== null}
              >
                {requested.pending
                  ? formatMessage({ id: "feature.export.device.requesting", defaultMessage: "Requesting" })
                  : formatMessage({ id: "feature.archive.exports.request", defaultMessage: "Export as ZIP" })}
              </Button>
            </div>
          </form>
        )}
        {exports.isPending ? <SkeletonRows rows={2} /> : null}
        {rows.length ? (
          <ExportsTable
            rows={rows}
            requesting={requested.pending}
            onRequestAgain={(row) => requested.request(meshId, requestOf(row))}
            onAnotherInterval={(row) => {
              requested.reset();
              setRange({ start: row.start, stop: row.stop });
              document.getElementById("archive-export-start")?.focus();
            }}
          />
        ) : null}
      </FramePanel>
    </Frame>
  );
}
