import type { Export } from "@mtt/contracts";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { pageHeadingClass } from "@/lib/page-heading";
import { useMe } from "@/features/auth/use-me";
import { deviceRepository } from "@/features/device/repository";
import { deviceTitle } from "@/features/device/model";
import { daysInRange, lastDays, pollInterval, requestOf, shiftDay, utcToday } from "@/features/export/model";
import { exportRepository } from "@/features/export/repository";
import { useRequestExport } from "@/features/export/use-request-export";
import { CsvRequestForm, type CsvRequestDraft } from "@/features/export/ui/csv-request-form";
import { ExportLimits } from "@/features/export/ui/export-limits";
import { ExportsTable } from "@/features/export/ui/exports-table";
import { canEditMesh, meshTitle } from "@/features/mesh/model";
import { meshRepository } from "@/features/mesh/repository";

/** The days just before a past download, of the same length, as a starting point for another interval. */
function previousInterval(row: Export): CsvRequestDraft["range"] {
  const length = daysInRange(row.start, row.stop);
  const stop = shiftDay(row.start, -1);
  return { start: shiftDay(stop, -(length - 1)), stop: stop > utcToday() ? utcToday() : stop };
}

/** Every user's CSV downloads: request one for a mesh they own, follow it, and ask again later. */
export function CsvDownloadsPage(): ReactElement {
  const { formatMessage } = useIntl();
  const { me } = useMe();
  const meshes = useQuery(meshRepository.list());
  const devices = useQuery(deviceRepository.list());
  const exports = useQuery({
    ...exportRepository.list(),
    refetchInterval: (query) => pollInterval(query.state.data),
  });
  const own = useMemo(() => (meshes.data ?? []).filter((mesh) => canEditMesh(mesh, me)), [meshes.data, me]);
  const meshTitles = useMemo(() => new Map((meshes.data ?? []).map((mesh) => [mesh.id, meshTitle(mesh)])), [meshes.data]);
  const deviceTitles = useMemo(
    () => new Map((devices.data ?? []).map((device) => [`${device.mesh_id}:${device.node_id}`, deviceTitle(device)])),
    [devices.data],
  );
  const rows = (exports.data ?? []).filter((row) => row.format === "csv");
  const requested = useRequestExport();
  const requestedAgain = useRequestExport();
  const formRef = useRef<HTMLDivElement>(null);
  // Bumped to restart the form from a past download's mesh and devices.
  const [draft, setDraft] = useState<{ key: number; value: CsvRequestDraft } | null>(null);
  const initial: CsvRequestDraft = draft?.value ?? { meshId: own[0]?.id ?? "", nodeIds: null, range: lastDays(7) };

  function anotherInterval(row: Export) {
    requested.reset();
    requestedAgain.reset();
    setDraft({ key: (draft?.key ?? 0) + 1, value: { meshId: row.mesh_id, nodeIds: row.node_ids ?? null, range: previousInterval(row) } });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => document.getElementById("csv-start")?.focus(), 300);
  }

  return (
    <>
      <div className={pageHeadingClass}>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">
            {formatMessage({ id: "page.csvDownloads.title", defaultMessage: "CSV downloads" })}
          </h1>
          <p className="max-w-2xl text-body-regular text-text-secondary">
            {formatMessage({
              id: "page.csvDownloads.description",
              defaultMessage:
                "Here you can download your data as CSV files.",
            })}
          </p>
          <p className="max-w-2xl text-body-regular text-text-secondary">
            {formatMessage({
              id: "page.csvDownloads.zipDescription",
              defaultMessage:
                "Each zip has a folder per day with CSV files per telemetry type in them.",
            })}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <ExportLimits />
        <div ref={formRef} className="scroll-mt-20">
          <Frame className="shadow-card">
            <FrameHeader>
              <FrameTitle>{formatMessage({ id: "page.csvDownloads.new.title", defaultMessage: "New download" })}</FrameTitle>
              <FrameDescription>
                {formatMessage({
                  id: "page.csvDownloads.new.description",
                  defaultMessage: "Trigger a new CSV download. Note: If you have already requested a certain device, and you want to request another period, use its calendar button below.",
                })}
              </FrameDescription>
            </FrameHeader>
            <FramePanel className="flex flex-col gap-6">
              {meshes.isPending ? <SkeletonRows rows={3} /> : null}
              {meshes.isError ? (
                <StatusCopy>
                  {formatMessage({
                    id: "page.csvDownloads.meshesError",
                    defaultMessage: "Meshes didn't load. Check your connection to the API and try again.",
                  })}
                </StatusCopy>
              ) : null}
              {meshes.data && own.length === 0 ? (
                <StatusCopy>
                  {formatMessage({
                    id: "page.csvDownloads.noMeshes",
                    defaultMessage: "You can download the readings of meshes you own. You don't own any yet.",
                  })}
                </StatusCopy>
              ) : null}
              {own.length ? (
                <CsvRequestForm key={draft?.key ?? 0} meshes={own} initial={initial} requested={requested} />
              ) : null}
              {exports.isPending ? <SkeletonRows rows={3} /> : null}
              {exports.isError ? (
                <StatusCopy>
                  {formatMessage({
                    id: "page.csvDownloads.list.error",
                    defaultMessage: "Your downloads didn't load. Try again shortly.",
                  })}
                </StatusCopy>
              ) : null}
              {exports.data && rows.length === 0 ? (
                <StatusCopy>
                  {formatMessage({ id: "page.csvDownloads.list.empty", defaultMessage: "No downloads yet." })}
                </StatusCopy>
              ) : null}
              {requestedAgain.error ? <StatusCopy>{requestedAgain.error}</StatusCopy> : null}
              {rows.length ? (
                <ExportsTable
                  rows={rows}
                  meshTitles={meshTitles}
                  deviceTitles={deviceTitles}
                  requesting={requestedAgain.pending}
                  onRequestAgain={(row) => {
                    requested.reset();
                    requestedAgain.request(row.mesh_id, requestOf(row));
                  }}
                  onAnotherInterval={anotherInterval}
                />
              ) : null}
            </FramePanel>
          </Frame>
        </div>
      </div>
    </>
  );
}
