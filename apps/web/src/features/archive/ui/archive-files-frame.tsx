import type { ArchiveManifest } from "@mtt/contracts";
import { Button, ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { RiArchiveStackLine, RiCalendarLine, RiDownloadLine, RiHardDrive3Line, RiTerminalBoxLine } from "@remixicon/react";
import { type ReactElement, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { Kpi } from "@/components/kpi/kpi";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { API_URL } from "@/lib/api-url";
import { formatBytes, groupByDay, summarizeArchive, zipDownloadUrl } from "@/features/archive/model";
import type { ArchiveCredentialsState } from "@/features/archive/use-archive-credentials";
import { ArchiveDayRow } from "@/features/archive/ui/archive-day-row";
import { ArchiveDownloadDialog } from "@/features/archive/ui/archive-download-dialog";

export type ArchiveFilesFrameProps = {
  meshId: string;
  meshTitle: string;
  manifest: ArchiveManifest | undefined;
  pending: boolean;
  failed: boolean;
  access: ArchiveCredentialsState;
};

/** Two weeks at first; the rest on request. */
const DAYS_SHOWN = 14;

const headClass = "h-8 px-3.5 text-left align-middle text-caption-1-medium whitespace-nowrap text-text-secondary";

/** What's stored for the mesh, a row per UTC day, newest first; each opens into its hours. */
export function ArchiveFilesFrame({ meshId, meshTitle, manifest, pending, failed, access }: ArchiveFilesFrameProps): ReactElement {
  const { formatMessage, locale } = useIntl();
  const partitions = manifest?.partitions ?? [];
  const summary = summarizeArchive(partitions);
  const days = useMemo(() => groupByDay(partitions), [partitions]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const shown = showAll ? days : days.slice(0, DAYS_SHOWN);
  const dash = formatMessage({ id: "common.format.emDash", defaultMessage: "—" });

  function toggle(dt: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(dt)) next.add(dt);
      return next;
    });
  }

  return (
    <Frame className="shadow-card">
      <FrameHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <FrameTitle>{formatMessage({ id: "feature.archive.files.title", defaultMessage: "Files" })}</FrameTitle>
          <FrameDescription>
            {manifest
              ? formatMessage(
                  {
                    id: "feature.archive.files.description",
                    defaultMessage: "Stored under {prefix}. Open a day to download single hours.",
                  },
                  { prefix: manifest.prefix },
                )
              : formatMessage({
                  id: "feature.archive.files.descriptionLoading",
                  defaultMessage: "One Parquet file per hour of readings.",
                })}
          </FrameDescription>
        </div>
        {manifest && partitions.length ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button type="button" size="small" variant="secondary" leadingIcon={RiTerminalBoxLine} onClick={() => setDownloadOpen(true)}>
              {formatMessage({ id: "feature.archive.files.commandLine", defaultMessage: "Command line" })}
            </Button>
            <ButtonLink href={zipDownloadUrl(API_URL, meshId)} size="small" leadingIcon={RiDownloadLine}>
              {formatMessage({ id: "feature.archive.files.downloadAll", defaultMessage: "Download all (ZIP)" })}
            </ButtonLink>
          </div>
        ) : null}
      </FrameHeader>
      <FramePanel className="flex flex-col gap-6">
        {pending ? <SkeletonRows rows={4} /> : null}
        {failed ? (
          <StatusCopy>
            {formatMessage({
              id: "feature.archive.files.error",
              defaultMessage: "The file list didn't load. The archive storage may be unreachable; try again shortly.",
            })}
          </StatusCopy>
        ) : null}
        {manifest ? (
          <>
            <div className="oa-arrive grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Archive summary">
              <Kpi
                icon={RiArchiveStackLine}
                label={formatMessage({ id: "feature.archive.files.kpi.files", defaultMessage: "Files" })}
                value={summary.files.toLocaleString(locale)}
                hint={formatMessage(
                  { id: "feature.archive.files.kpi.days", defaultMessage: "{count, plural, one {# day} other {# days}}" },
                  { count: days.length },
                )}
              />
              <Kpi
                icon={RiHardDrive3Line}
                label={formatMessage({ id: "feature.archive.files.kpi.size", defaultMessage: "Size" })}
                value={formatBytes(summary.bytes, locale)}
              />
              <Kpi
                icon={RiCalendarLine}
                label={formatMessage({ id: "feature.archive.files.kpi.first", defaultMessage: "First hour (UTC)" })}
                value={summary.first ?? dash}
              />
              <Kpi
                icon={RiCalendarLine}
                label={formatMessage({ id: "feature.archive.files.kpi.last", defaultMessage: "Latest hour (UTC)" })}
                value={summary.last ?? dash}
              />
            </div>
            {days.length ? (
              <div className="flex flex-col gap-3">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-left text-body-2-regular">
                    <thead>
                      <tr>
                        <th className={headClass}>
                          {formatMessage({ id: "feature.archive.files.columns.day", defaultMessage: "Day (UTC)" })}
                        </th>
                        <th className={headClass}>
                          {formatMessage({ id: "feature.archive.files.columns.hours", defaultMessage: "Hours" })}
                        </th>
                        <th className={headClass}>
                          {formatMessage({ id: "feature.archive.files.columns.size", defaultMessage: "Size" })}
                        </th>
                        <th className={headClass}>
                          {formatMessage({ id: "feature.archive.files.columns.updated", defaultMessage: "Last written" })}
                        </th>
                        <th className={`${headClass} text-right`}>
                          {formatMessage({ id: "feature.archive.files.columns.download", defaultMessage: "Download" })}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((day) => (
                        <ArchiveDayRow
                          key={day.dt}
                          meshId={meshId}
                          day={day}
                          expanded={expanded.has(day.dt)}
                          onToggle={() => toggle(day.dt)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                {days.length > DAYS_SHOWN ? (
                  <Button type="button" size="xs" variant="secondary" className="self-start" onClick={() => setShowAll((all) => !all)}>
                    {showAll
                      ? formatMessage(
                          { id: "feature.archive.files.showRecent", defaultMessage: "Show the last {count} days" },
                          { count: DAYS_SHOWN },
                        )
                      : formatMessage(
                          { id: "feature.archive.files.showAll", defaultMessage: "Show all {count} days" },
                          { count: days.length },
                        )}
                  </Button>
                ) : null}
              </div>
            ) : (
              <StatusCopy>
                {formatMessage({
                  id: "feature.archive.files.empty",
                  defaultMessage: "Nothing archived yet. Files appear once a stored device reports.",
                })}
              </StatusCopy>
            )}
          </>
        ) : null}
      </FramePanel>
      {manifest && downloadOpen ? (
        <ArchiveDownloadDialog
          open
          onClose={() => setDownloadOpen(false)}
          access={access}
          meshId={meshId}
          prefix={manifest.prefix}
          meshTitle={meshTitle}
          files={summary.files}
          bytes={summary.bytes}
        />
      ) : null}
    </Frame>
  );
}
