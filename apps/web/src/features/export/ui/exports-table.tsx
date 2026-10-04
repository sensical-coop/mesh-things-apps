import type { Export } from "@mtt/contracts";
import { Button, ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { RiCalendarScheduleLine, RiDownloadLine, RiRefreshLine } from "@remixicon/react";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { useFormatters } from "@/hooks/use-formatters";
import { formatBytes } from "@/features/archive/model";
import { isActive, progressOf } from "@/features/export/model";
import { ExportStatusChip } from "@/features/export/ui/export-status-chip";

export type ExportsTableProps = {
  rows: readonly Export[];
  /** Mesh titles by id; the column is left out without them, as on a page about one mesh. */
  meshTitles?: ReadonlyMap<string, string>;
  /** Device titles by `<mesh_id>:<node_id>`. */
  deviceTitles?: ReadonlyMap<string, string>;
  onRequestAgain: (row: Export) => void;
  onAnotherInterval?: (row: Export) => void;
  /** While a request is on its way, so the buttons can't send it twice. */
  requesting: boolean;
};

const headClass = "h-8 px-3.5 text-left align-middle text-caption-1-medium whitespace-nowrap text-text-secondary";
const cellClass = "px-3.5 py-2.5 align-middle";

/** Downloads, newest first: what each holds, how it's going, and what can be done with it. */
export function ExportsTable({
  rows,
  meshTitles,
  deviceTitles,
  onRequestAgain,
  onAnotherInterval,
  requesting,
}: ExportsTableProps): ReactElement {
  const { formatMessage, locale } = useIntl();
  const { formatWhen } = useFormatters();
  const dash = formatMessage({ id: "common.format.emDash", defaultMessage: "—" });
  const anyActive = rows.some((row) => isActive(row.status));

  function devicesLabel(row: Export): string {
    if (!row.node_ids?.length) return formatMessage({ id: "feature.export.table.allDevices", defaultMessage: "All devices" });
    return row.node_ids.map((node) => deviceTitles?.get(`${row.mesh_id}:${node}`) ?? `Node ${node}`).join(", ");
  }

  function daysLabel(row: Export): string {
    return row.start === row.stop ? row.start : `${row.start} → ${row.stop}`;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-left text-body-2-regular">
        <thead>
          <tr>
            {meshTitles ? (
              <th className={headClass}>{formatMessage({ id: "feature.export.table.mesh", defaultMessage: "Mesh" })}</th>
            ) : null}
            <th className={headClass}>{formatMessage({ id: "feature.export.table.devices", defaultMessage: "Devices" })}</th>
            <th className={headClass}>{formatMessage({ id: "feature.export.table.days", defaultMessage: "Days (UTC)" })}</th>
            <th className={headClass}>{formatMessage({ id: "feature.export.table.status", defaultMessage: "Status" })}</th>
            <th className={headClass}>{formatMessage({ id: "feature.export.table.size", defaultMessage: "Size" })}</th>
            <th className={headClass}>
              {formatMessage({ id: "feature.export.table.available", defaultMessage: "Available until" })}
            </th>
            <th className={`${headClass} text-right`}>
              <span className="sr-only">{formatMessage({ id: "feature.export.table.actions", defaultMessage: "Actions" })}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-separator-border text-text-primary">
              {meshTitles ? <td className={cellClass}>{meshTitles.get(row.mesh_id) ?? dash}</td> : null}
              <td className={`${cellClass} max-w-[16rem] truncate`} title={devicesLabel(row)}>
                {devicesLabel(row)}
              </td>
              <td className={`${cellClass} whitespace-nowrap tabular-nums`}>{daysLabel(row)}</td>
              <td className={cellClass}>
                <div className="flex min-w-[9rem] flex-col items-start gap-1">
                  <ExportStatusChip status={row.status} />
                  {row.status === "running" ? (
                    <div
                      className="h-1 w-full overflow-hidden rounded-full bg-background-tertiary-default"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={row.days_total}
                      aria-valuenow={row.days_done}
                      aria-label={formatMessage(
                        { id: "feature.export.table.progress", defaultMessage: "{done} of {total} days" },
                        { done: row.days_done, total: row.days_total },
                      )}
                    >
                      <div className="h-full rounded-full bg-accent-500 transition-[width]" style={{ width: `${progressOf(row) * 100}%` }} />
                    </div>
                  ) : null}
                  {row.status === "failed" && row.error ? (
                    <span className="text-caption-1-regular text-text-secondary">{row.error}</span>
                  ) : null}
                </div>
              </td>
              <td className={`${cellClass} tabular-nums text-text-secondary`}>
                {row.size != null ? formatBytes(row.size, locale) : dash}
              </td>
              <td className={`${cellClass} whitespace-nowrap tabular-nums text-text-secondary`}>
                {row.status === "ready" ? formatWhen(row.expires_at) : dash}
              </td>
              <td className={`${cellClass} text-right`}>
                <div className="flex justify-end gap-1.5">
                  {row.status === "ready" && row.url ? (
                    <ButtonLink href={row.url} size="xs" leadingIcon={RiDownloadLine}>
                      {formatMessage({ id: "feature.export.table.download", defaultMessage: "Download" })}
                    </ButtonLink>
                  ) : null}
                  {row.status === "expired" || row.status === "failed" ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="secondary"
                      leadingIcon={RiRefreshLine}
                      disabled={requesting || anyActive}
                      title={
                        anyActive
                          ? formatMessage({
                              id: "feature.export.table.waitHint",
                              defaultMessage: "Available once the download being prepared is ready.",
                            })
                          : undefined
                      }
                      onClick={() => onRequestAgain(row)}
                    >
                      {formatMessage({ id: "feature.export.table.requestAgain", defaultMessage: "Request again" })}
                    </Button>
                  ) : null}
                  {onAnotherInterval && !isActive(row.status) ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="secondary"
                      iconOnly
                      leadingIcon={RiCalendarScheduleLine}
                      aria-label={formatMessage({
                        id: "feature.export.table.anotherInterval",
                        defaultMessage: "Request other days for the same devices",
                      })}
                      title={formatMessage({
                        id: "feature.export.table.anotherInterval",
                        defaultMessage: "Request other days for the same devices",
                      })}
                      onClick={() => onAnotherInterval(row)}
                    />
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
