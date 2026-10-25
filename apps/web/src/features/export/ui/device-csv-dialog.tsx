import type { DeviceRead, Export, ExportRequest } from "@mtt/contracts";
import { Button, ButtonLink } from "@mtt/ui/components/base/buttons/button";
import { RiDownloadLine, RiRefreshLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { RouterButtonLink } from "@/components/router-button-link";
import { useFormatters } from "@/hooks/use-formatters";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { formatBytes } from "@/features/archive/model";
import { deviceTitle } from "@/features/device/model";
import { isActive, lastDays, pollInterval, progressOf, rangeProblem, requestOf } from "@/features/export/model";
import { exportRepository } from "@/features/export/repository";
import { useRequestExport } from "@/features/export/use-request-export";
import { ExportLimits } from "@/features/export/ui/export-limits";
import { ExportRangeFields, type ExportRange } from "@/features/export/ui/export-range-fields";
import { ExportStatusChip } from "@/features/export/ui/export-status-chip";
import { routes } from "@/router";

export type DeviceCsvDialogProps = {
  device: DeviceRead;
  onClose: () => void;
};

function isThisDevice(row: Export, device: DeviceRead): boolean {
  return row.format === "csv" && row.node_ids?.length === 1 && row.node_ids[0] === device.node_id;
}

/** Ask for one device's readings as CSV over some days, and follow that download until it's ready. */
export function DeviceCsvDialog({ device, onClose }: DeviceCsvDialogProps): ReactElement {
  const { formatMessage, locale } = useIntl();
  const { formatWhen } = useFormatters();
  const [range, setRange] = useState<ExportRange>(() => lastDays(7));
  const exports = useQuery({
    ...exportRepository.meshList({ path: { mesh_id: device.mesh_id } }),
    refetchInterval: (query) => pollInterval(query.state.data),
  });
  const requested = useRequestExport();
  const latest = exports.data?.find((row) => isThisDevice(row, device));
  const title = deviceTitle(device);

  function submit(body: ExportRequest = { format: "csv", ...range, node_ids: [device.node_id] }) {
    requested.request(device.mesh_id, body);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rangeProblem(range.start, range.stop) === null) submit();
  }

  return (
    <Modal
      open
      title={formatMessage({ id: "feature.export.device.title", defaultMessage: "Download CSV — {device}" }, { device: title })}
      description={formatMessage({
        id: "feature.export.device.description",
        defaultMessage:
          "This device's readings as one zip: a CSV file per measurement and day.",
      })}
      onClose={onClose}
    >
      <div className="flex flex-col gap-6">
        <ExportLimits />
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <ExportRangeFields
            idPrefix="device-csv"
            value={range}
            onChange={(next) => {
              requested.reset();
              setRange(next);
            }}
          />
          {requested.error ? (
            <p className="text-body-regular text-text-secondary" role="status">
              {requested.error}
            </p>
          ) : null}
          <div className={dialogActionsClass}>
            <Button
              type="submit"
              size="small"
              leadingIcon={RiDownloadLine}
              disabled={requested.pending || rangeProblem(range.start, range.stop) !== null}
            >
              {requested.pending
                ? formatMessage({ id: "feature.export.device.requesting", defaultMessage: "Requesting" })
                : formatMessage({ id: "feature.export.device.request", defaultMessage: "Prepare CSV" })}
            </Button>
          </div>
        </form>

        {latest ? (
          <section className="flex flex-col gap-2" aria-live="polite">
            <h3 className="text-caption-1-medium text-text-secondary">
              {formatMessage({ id: "feature.export.device.latest", defaultMessage: "Latest download of this device" })}
            </h3>
            <div className="oa-squircle-inset flex flex-col gap-3 bg-background-secondary-default p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ExportStatusChip status={latest.status} />
                  <span className="text-body-regular text-text-primary tabular-nums">
                    {latest.start === latest.stop ? latest.start : `${latest.start} → ${latest.stop}`}
                  </span>
                </div>
                <p className="text-caption-1-regular text-text-secondary">
                  {isActive(latest.status)
                    ? formatMessage(
                        {
                          id: "feature.export.device.progress",
                          defaultMessage: "{done} of {total} days prepared. You can close this; we'll email you when it's ready.",
                        },
                        { done: latest.days_done, total: latest.days_total },
                      )
                    : latest.status === "ready"
                      ? formatMessage(
                          { id: "feature.export.device.readyUntil", defaultMessage: "{size}, available until {when}." },
                          { size: formatBytes(latest.size ?? 0, locale), when: formatWhen(latest.expires_at) },
                        )
                      : latest.status === "failed"
                        ? (latest.error ?? "")
                        : formatMessage({
                            id: "feature.export.device.expired",
                            defaultMessage: "The file was deleted. Request it again to rebuild it.",
                          })}
                </p>
                {latest.status === "running" ? (
                  <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-background-tertiary-default">
                    <div className="h-full rounded-full bg-accent-500 transition-[width]" style={{ width: `${progressOf(latest) * 100}%` }} />
                  </div>
                ) : null}
              </div>
              {latest.status === "ready" && latest.url ? (
                <ButtonLink href={latest.url} size="small" leadingIcon={RiDownloadLine} className="shrink-0">
                  {formatMessage({ id: "feature.export.table.download", defaultMessage: "Download" })}
                </ButtonLink>
              ) : latest.status === "expired" || latest.status === "failed" ? (
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  leadingIcon={RiRefreshLine}
                  className="shrink-0"
                  disabled={requested.pending}
                  onClick={() => submit(requestOf(latest))}
                >
                  {formatMessage({ id: "feature.export.table.requestAgain", defaultMessage: "Request again" })}
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className={dialogActionsClass}>
          <RouterButtonLink to={routes.csvDownloads} size="small" variant="secondary">
            {formatMessage({ id: "feature.export.device.all", defaultMessage: "All CSV downloads" })}
          </RouterButtonLink>
          <Button type="button" size="small" variant="secondary" onClick={onClose}>
            {formatMessage({ id: "feature.export.device.close", defaultMessage: "Close" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
