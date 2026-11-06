import type {
  DeviceMeasurement,
  DeviceRead,
  DeviceTelemetryVariant,
} from "@mtt/contracts";
import { cx } from "@mtt/ui/utils/cx";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { useFormatters } from "@/hooks/use-formatters";
import { AlarmBellButton } from "@/features/alarm/ui/alarm-bell-button";
import { ArchiveButton } from "@/features/archive/ui/archive-button";
import { channelShortName, isDerivedMeasurement } from "@/lib/measurement";
import { ComputedFlag } from "@/components/computed-flag";
import { StatusCopy } from "@/components/status-copy";


import { chartAnchorId } from "./chart-anchor";

export function TelemetryVariantSection({
  variant,
  device,
  measurements,
  canEdit,
  canArchive,
  onViewChart,
}: {
  /** Null: the channels blueprints derive, which belong to no reported variant. */
  variant: DeviceTelemetryVariant | null;
  device: DeviceRead | undefined;
  measurements: DeviceMeasurement[];
  canEdit: boolean;
  canArchive: boolean;
  onViewChart: (channel: string) => void;
}): ReactElement {
  const { formatMessage } = useIntl();
  const { formatLastSeen, formatWhen } = useFormatters();
  const tv = variant?.telemetry_variant;
  const deviceReading = device?.reading_interval_seconds;
  const devicePublish = device?.publish_interval_seconds;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="flex min-w-0 items-center gap-2 text-body-medium wrap-break-word text-text-primary">
            {tv
              ? (tv.name ?? tv.payload_kind)
              : formatMessage({ id: "page.devices.detail.computedGroup", defaultMessage: "Computed" })}
          </h3>
          {variant && tv ? (
            <span className="min-w-0 text-caption-1-regular wrap-break-word text-text-secondary">
              {formatMessage(
                { id: "page.devices.detail.variants.last", defaultMessage: "last {when}" },
                { when: formatWhen(variant.last_seen) },
              )}
              {deviceReading != null
                ? ` · ${formatMessage(
                    {
                      id: "page.devices.detail.variants.deviceInterval",
                      defaultMessage: "reading {reading}s · publish {publish}s",
                    },
                    { reading: deviceReading, publish: devicePublish ?? "—" },
                  )}`
                : tv.default_reading_interval_seconds
                  ? ` · ${formatMessage(
                      {
                        id: "page.devices.detail.variants.defaultInterval",
                        defaultMessage: "default reading {seconds}s",
                      },
                      { seconds: tv.default_reading_interval_seconds },
                    )}`
                  : ""}
            </span>
          ) : (
            <span className="min-w-0 text-caption-1-regular wrap-break-word text-text-secondary">
              {formatMessage({
                id: "page.devices.detail.variants.computedMeta",
                defaultMessage: "derived by the blueprints attached below",
              })}
            </span>
          )}
        </div>
        {tv?.description ? (
          <p className="text-caption-1-regular text-text-secondary">{tv.description}</p>
        ) : null}
      </div>
      {measurements.length ? (
        <div className="oa-arrive overflow-x-auto">
          <table
            className={cx(
              "w-full table-fixed caption-bottom text-left text-body-2-regular",
              canArchive ? "min-w-228" : "min-w-208",
            )}
          >
            <thead>
              <tr>
                <th className="h-8 w-72 px-3.5 text-left align-middle text-caption-1-medium wrap-break-word text-text-secondary">
                  {formatMessage({
                    id: "page.devices.detail.variants.columns.measurement",
                    defaultMessage: "Measurement",
                  })}
                </th>
                <th className="h-8 w-16 px-3.5 text-left align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                  {formatMessage({ id: "page.devices.detail.variants.columns.unit", defaultMessage: "Unit" })}
                </th>
                <th className="h-8 w-32 px-3.5 text-left align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                  {formatMessage({
                    id: "page.devices.detail.variants.columns.range",
                    defaultMessage: "Valid range",
                  })}
                </th>
                <th className="h-8 w-64 px-3.5 text-left align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                  {formatMessage({
                    id: "page.devices.detail.variants.columns.lastSeen",
                    defaultMessage: "Last seen",
                  })}
                </th>
                <th className="h-8 w-28 px-3.5 text-left align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                  {formatMessage({ id: "page.devices.detail.variants.columns.chart", defaultMessage: "Chart" })}
                </th>
                {canEdit ? (
                  <th className="h-8 w-16 px-3.5 text-right align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                    {formatMessage({ id: "page.devices.detail.variants.columns.alarms", defaultMessage: "Alarms" })}
                  </th>
                ) : null}
                {canArchive ? (
                  <th className="h-8 w-20 px-3.5 text-right align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                    {formatMessage({ id: "page.devices.detail.variants.columns.archive", defaultMessage: "S3 storage" })}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {measurements.map((row) => {
                const channel = row.measurement_type.channel;
                return (
                  <tr key={row.id} className="text-text-primary hover:bg-background-primary-hover">
                    <td className="h-8 w-72 px-3.5 py-0 align-middle wrap-break-word">
                      <span className="flex min-w-0 items-center gap-2">
                        {row.measurement_type.display_name ?? channelShortName(channel)}
                        {isDerivedMeasurement(row.measurement_type) ? <ComputedFlag /> : null}
                      </span>
                    </td>
                    <td className="h-8 px-3.5 py-0 align-middle whitespace-nowrap text-text-secondary">
                      {row.measurement_type.native_unit ?? "—"}
                    </td>
                    <td className="h-8 px-3.5 py-0 align-middle whitespace-nowrap text-text-secondary">
                      {row.valid_min != null || row.valid_max != null
                        ? `${row.valid_min ?? "—"} … ${row.valid_max ?? "—"}`
                        : "—"}
                    </td>
                    <td className="h-8 px-3.5 py-0 align-middle wrap-break-word text-text-secondary">
                      {formatLastSeen(row.last_seen)}
                    </td>
                    <td className="h-8 px-3.5 py-0 text-left align-middle whitespace-nowrap">
                      <a
                        href={`#${chartAnchorId(channel)}`}
                        onClick={(event) => {
                          event.preventDefault();
                          onViewChart(channel);
                        }}
                        className="rounded-full text-caption-1-medium text-accent-500 outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                      >
                        {formatMessage({
                          id: "page.devices.detail.variants.viewChart",
                          defaultMessage: "View chart",
                        })}
                      </a>
                    </td>
                    {canEdit ? (
                      <td className="h-8 px-3.5 py-0 text-right align-middle whitespace-nowrap">
                        {device ? (
                          <AlarmBellButton
                            deviceUuid={device.uuid}
                            channel={channel}
                            label={row.measurement_type.display_name ?? channel}
                          />
                        ) : null}
                      </td>
                    ) : null}
                    {canArchive ? (
                      <td className="h-8 px-3.5 py-0 text-right align-middle whitespace-nowrap">
                        {device ? <ArchiveButton device={device} /> : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <StatusCopy>
          {formatMessage({
            id: "page.devices.detail.variants.noMeasurements",
            defaultMessage: "No measurements discovered for this variant yet.",
          })}
        </StatusCopy>
      )}
    </div>
  );
}
