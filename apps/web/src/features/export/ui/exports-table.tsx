import type { Export } from "@mtt/contracts";
import { Button, ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { RiCalendarScheduleLine, RiDownloadLine } from "@remixicon/react";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { useFormatters } from "@/hooks/use-formatters";
import { canRequestAgain, isActive, progressOf } from "@/features/export/model";
import { ExportStatusChip } from "@/features/export/ui/export-status-chip";
import { RequestAgainButton } from "@/features/export/ui/request-again-button";
import { cx } from "@mtt/ui/utils";
import { formatBytes } from "@/lib/format";

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
      <table className="w-full min-w-176 text-left text-body-2-regular">
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
            <th className={cx(headClass, "text-right")}>
              <span className="sr-only">{formatMessage({ id: "feature.export.table.actions", defaultMessage: "Actions" })}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-separator-border text-text-primary">
              {meshTitles ? <td className={cellClass}>{meshTitles.get(row.mesh_id) ?? dash}</td> : null}
              <td className={cx(cellClass, "max-w-[16rem] truncate")} title={devicesLabel(row)}>
                {devicesLabel(row)}
              </td>
              <td className={cx(cellClass, "whitespace-nowrap tabular-nums")}>{daysLabel(row)}</td>
              <td className={cellClass}>
                <div className="flex min-w-36 flex-col items-start gap-1">
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
              <td className={cx(cellClass, "text-text-secondary tabular-nums")}>
                {row.size != null ? formatBytes(row.size, locale) : dash}
              </td>
              <td className={cx(cellClass, "whitespace-nowrap text-text-secondary tabular-nums")}>
                {row.status === "ready" ? formatWhen(row.expires_at) : dash}
              </td>
              <td className={cx(cellClass, "text-right")}>
                <div className="flex justify-end gap-1.5">
                  {row.status === "ready" && row.url ? (
                    <ButtonLink href={row.url} size="xs" leadingIcon={RiDownloadLine}>
                      {formatMessage({ id: "feature.export.table.download", defaultMessage: "Download" })}
                    </ButtonLink>
                  ) : null}
                  {canRequestAgain(row.status) ? (
                    <RequestAgainButton
                      size="xs"
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
                    />
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
