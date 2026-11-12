import type {
  DeviceMeasurement,
  DeviceQualityResponse,
  DeviceRead,
  DeviceTelemetryVariant,
  MeasurementTypeRead,
} from "@mtt/contracts";
import { cx } from "@mtt/ui/utils";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { type UseQueryResult } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl, type IntlShape } from "react-intl";
import { useFormatters, type Formatters } from "@/hooks/use-formatters";
import { Kpi } from "@/components/kpi/kpi";
import { isChartableMeasurement, isDerivedMeasurement, measurementLabel } from "@/lib/measurement";
import { SkeletonRows } from "@/components/skeleton-rows";
import { Item } from "./item";
import { StatusCopy } from "@/components/status-copy";
import { deviceLastSeen, deviceTitle } from "@/features/device/model";
import { formatGapShort } from "@/features/device/format-gap";
import { DeviceAllowedBadge } from "@/features/device/ui/allowed-badge";
import { DeviceLocationFrame } from "@/features/device/ui/location-frame";
import { PostprocessingsPanel } from "@/features/postprocessing/ui/postprocessings-panel";
import { DeviceLinksFrame } from "@/features/mesh-network/ui/device-links-frame";
import { DeviceTrackFrame } from "@/features/mesh-network/ui/device-track-frame";
import { DeviceTrafficFrame } from "@/features/mesh-network/ui/device-traffic-frame";


import { TelemetryVariantSection } from "./telemetry-variant-section";

export type NamesByChannel = Map<string, MeasurementTypeRead>;

export function DeviceStatusTab({
  device,
  quality,
  variants,
  seen,
  names,
  canEdit,
  canArchive,
  meshOwnerId,
  onViewChart,
}: {
  device: UseQueryResult<DeviceRead, unknown>;
  quality: UseQueryResult<DeviceQualityResponse, unknown>;
  variants: UseQueryResult<DeviceTelemetryVariant[], unknown>;
  seen: UseQueryResult<DeviceMeasurement[], unknown>;
  names: NamesByChannel;
  canEdit: boolean;
  canArchive: boolean;
  meshOwnerId: string | undefined;
  onViewChart: (channel: string) => void;
}): ReactElement {
  const { formatMessage } = useIntl();
  const { formatLastSeen, formatRatio, formatWhen } = useFormatters();
  const qualitySummary = quality.data
    ? qualityHeadlineKpis(quality.data, formatMessage, formatRatio, { withAlarms: canEdit })
    : [];
  const qualitySlots = canEdit ? ["range", "completeness", "alarms"] : ["range", "completeness"];
  const qualityCols = canEdit ? "sm:grid-cols-3" : "sm:grid-cols-2";
  const pointsIngested = quality.data?.points_ingested;
  const computedRows = (seen.data ?? []).filter((row) => isDerivedMeasurement(row.measurement_type));
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Frame className="shadow-card">
          <FrameHeader>
            <FrameTitle>{formatMessage({ id: "page.devices.detail.identity.title", defaultMessage: "Identity" })}</FrameTitle>
            <FrameDescription>
              {device.isPending
                ? formatMessage({
                    id: "page.devices.detail.identity.loading",
                    defaultMessage: "Loading this registration.",
                  })
                : device.error
                  ? formatMessage({
                      id: "page.devices.detail.identity.error",
                      defaultMessage: "This device is not in the inventory.",
                    })
                  : formatMessage({
                      id: "page.devices.detail.identity.description",
                      defaultMessage: "Registration, hardware, and last time it was heard.",
                    })}
            </FrameDescription>
          </FrameHeader>
          <FramePanel className="flex-1">
            {device.isPending ? <SkeletonRows rows={4} /> : null}
            {device.data ? (
              <dl className="grid oa-arrive gap-3 sm:grid-cols-2">
                <Item
                  label={formatMessage({ id: "page.devices.detail.identity.nodeId", defaultMessage: "Node ID" })}
                  value={String(device.data.node_id)}
                />
                {device.data.label && device.data.label.trim() !== deviceTitle(device.data) ? (
                  <Item
                    label={formatMessage({ id: "page.devices.detail.identity.label", defaultMessage: "Label" })}
                    value={device.data.label}
                  />
                ) : null}
                <Item
                  label={formatMessage({ id: "page.devices.detail.identity.allowed", defaultMessage: "Allowed" })}
                  value={<DeviceAllowedBadge allowed={device.data.is_allowed} />}
                />
                <Item
                  label={formatMessage({ id: "page.devices.detail.identity.lastSeen", defaultMessage: "Last seen" })}
                  value={formatLastSeen(deviceLastSeen(device.data))}
                />
                <Item
                  label={formatMessage({ id: "page.devices.detail.identity.hardware", defaultMessage: "Hardware" })}
                  value={
                    device.data.hardware_type ??
                    formatMessage({ id: "page.devices.detail.identity.unknownHardware", defaultMessage: "Unknown" })
                  }
                />
                <Item
                  label={formatMessage({ id: "page.devices.detail.identity.protocol", defaultMessage: "Protocol" })}
                  value={formatMessage(
                    { id: "page.devices.detail.identity.protocolValue", defaultMessage: "Meshtastic {version}, its mesh's" },
                    { version: device.data.protocol },
                  )}
                />
                <Item
                  label={formatMessage({ id: "page.devices.detail.identity.firmware", defaultMessage: "Firmware" })}
                  value={
                    device.data.firmware_version
                      ? device.data.firmware_seen_at
                        ? formatMessage(
                            {
                              id: "page.devices.detail.identity.firmwareSeen",
                              defaultMessage: "{version}, reported {when}",
                            },
                            { version: device.data.firmware_version, when: formatWhen(device.data.firmware_seen_at) },
                          )
                        : device.data.firmware_version
                      : formatMessage({
                          id: "page.devices.detail.identity.noFirmware",
                          defaultMessage: "Not reported. Only a device with its own MQTT uplink and map reports sends it.",
                        })
                  }
                />
                {device.data.region || device.data.modem_preset ? (
                  <Item
                    label={formatMessage({
                      id: "page.devices.detail.identity.radio",
                      defaultMessage: "Region / preset",
                    })}
                    value={`${device.data.region ?? "—"} / ${device.data.modem_preset ?? "—"}`}
                  />
                ) : null}
                <Item
                  label={formatMessage({
                    id: "page.devices.detail.identity.readPublish",
                    defaultMessage: "Read / publish",
                  })}
                  value={`${device.data.reading_interval_seconds ?? "—"}s / ${device.data.publish_interval_seconds ?? "—"}s`}
                />
                {device.data.archive_enabled !== undefined ? (
                  <Item
                    label={formatMessage({ id: "page.devices.detail.identity.archive", defaultMessage: "S3 storage" })}
                    value={
                      device.data.archive_enabled
                        ? device.data.archive_enabled_at
                          ? formatMessage(
                              { id: "page.devices.detail.identity.archiveSince", defaultMessage: "On since {when}" },
                              { when: formatWhen(device.data.archive_enabled_at) },
                            )
                          : formatMessage({ id: "page.devices.detail.identity.archiveOn", defaultMessage: "On" })
                        : formatMessage({ id: "page.devices.detail.identity.archiveOff", defaultMessage: "Off" })
                    }
                  />
                ) : null}
                <Item
                  label={formatMessage({
                    id: "page.devices.detail.identity.coordinates",
                    defaultMessage: "Coordinates",
                  })}
                  value={
                    device.data.latitude != null && device.data.longitude != null
                      ? `${device.data.latitude}, ${device.data.longitude}${
                          device.data.location_overridden
                            ? ` (${formatMessage({
                                id: "page.devices.detail.identity.overridden",
                                defaultMessage: "overridden",
                              })})`
                            : ""
                        }`
                      : formatMessage({
                          id: "page.devices.detail.identity.noCoordinates",
                          defaultMessage: "No coordinates",
                        })
                  }
                />
              </dl>
            ) : null}
          </FramePanel>
        </Frame>
        <DeviceLocationFrame device={device.data} pending={device.isPending} canEdit={canEdit} />
      </div>
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle>{formatMessage({ id: "page.devices.detail.quality.title", defaultMessage: "Quality" })}</FrameTitle>
          <FrameDescription>
            {pointsIngested != null
              ? formatMessage(
                  {
                    id: "page.devices.detail.quality.pointsIngested",
                    defaultMessage: "{count, number} points ingested in the last 24 hours.",
                  },
                  { count: pointsIngested },
                )
              : canEdit
                ? formatMessage({
                    id: "page.devices.detail.quality.descriptionDefault",
                    defaultMessage: "Ingest, range, and alarms for the last 24 hours.",
                  })
                : formatMessage({
                    id: "page.devices.detail.quality.descriptionReadOnly",
                    defaultMessage: "Ingest and range for the last 24 hours.",
                  })}
          </FrameDescription>
        </FrameHeader>
        <FramePanel>
          {quality.isPending ? (
            <div className={cx("grid gap-3", qualityCols)} aria-hidden>
              {qualitySlots.map((slot) => (
                <div key={slot} className="h-24 oa-squircle-inset bg-background-primary-default" />
              ))}
            </div>
          ) : null}
          {quality.error ? (
            <StatusCopy>
              {formatMessage({
                id: "page.devices.detail.quality.error",
                defaultMessage: "Quality did not load. Please check again soon.",
              })}
            </StatusCopy>
          ) : null}
          {quality.data ? (
            <div className="flex flex-col gap-6">
              <div className={cx("grid oa-arrive gap-3", qualityCols)} role="group" aria-label="Quality summary">
                {qualitySummary.map((kpi) => (
                  <Kpi key={kpi.label} label={kpi.label} value={kpi.value} hint={kpi.hint} />
                ))}
              </div>
              {quality.data.channels.length ? (
                <div className="flex flex-col gap-2">
                  <p className="text-caption-1-medium text-text-secondary">
                    {formatMessage({ id: "page.devices.detail.quality.byChannel", defaultMessage: "By channel" })}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[20rem] text-left text-body-2-regular">
                      <thead>
                        <tr>
                          <th className="h-8 pe-2 text-caption-1-medium text-text-secondary">
                            {formatMessage({ id: "page.devices.detail.quality.columns.channel", defaultMessage: "Channel" })}
                          </th>
                          <th className="h-8 px-2 text-caption-1-medium text-text-secondary">
                            {formatMessage({ id: "page.devices.detail.quality.columns.complete", defaultMessage: "Complete" })}
                          </th>
                          <th className="h-8 px-2 text-caption-1-medium text-text-secondary">
                            {formatMessage({ id: "page.devices.detail.quality.columns.observed", defaultMessage: "Observed" })}
                          </th>
                          <th className="h-8 ps-2 text-caption-1-medium text-text-secondary">
                            {formatMessage({
                              id: "page.devices.detail.quality.columns.largestGap",
                              defaultMessage: "Largest gap",
                            })}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {quality.data.channels.map((row) => (
                          <tr key={row.channel}>
                            <td className="py-1.5 pe-2 text-text-primary">
                              {measurementLabel({ channel: row.channel, display_name: names.get(row.channel)?.display_name })}
                            </td>
                            <td className="px-2 py-1.5 text-text-primary tabular-nums">
                              {formatRatio(row.completeness_ratio)}
                            </td>
                            <td className="px-2 py-1.5 text-text-secondary tabular-nums">
                              {row.observed ?? "—"} / {row.expected ?? "—"}
                            </td>
                            <td className="py-1.5 ps-2 text-text-secondary tabular-nums">
                              {formatGapShort(row.largest_gap_seconds, formatMessage)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <StatusCopy>
                  {formatMessage({
                    id: "page.devices.detail.quality.noChannels",
                    defaultMessage: "No quality channels yet.",
                  })}
                </StatusCopy>
              )}
            </div>
          ) : null}
        </FramePanel>
      </Frame>
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle>
            {formatMessage({ id: "page.devices.detail.variants.title", defaultMessage: "Telemetry variants" })}
          </FrameTitle>
          <FrameDescription>
            {formatMessage({
              id: "page.devices.detail.variants.description",
              defaultMessage: "Payload variants this device has sent, and this device's valid ranges.",
            })}
          </FrameDescription>
        </FrameHeader>
        <FramePanel className="flex flex-col gap-8">
          {variants.isPending ? <SkeletonRows rows={2} /> : null}
          {variants.data?.length
            ? variants.data.map((variant) => {
                const measurements = (seen.data ?? []).filter(
                  (row) =>
                    row.telemetry_variant_id === variant.telemetry_variant.id &&
                    isChartableMeasurement(row.measurement_type) &&
                    !isDerivedMeasurement(row.measurement_type),
                );
                // A variant whose only channels are quality diagnostics has
                // nothing chartable to show, so skip the whole section.
                if (!measurements.length) return null;
                return (
                  <TelemetryVariantSection
                    key={variant.id}
                    variant={variant}
                    device={device.data}
                    measurements={measurements}
                    canEdit={canEdit}
                    canArchive={canArchive}
                    onViewChart={onViewChart}
                  />
                );
              })
            : !variants.isPending && (
                <StatusCopy>
                  {formatMessage({
                    id: "page.devices.detail.variants.none",
                    defaultMessage: "No telemetry variants discovered yet.",
                  })}
                </StatusCopy>
              )}
          {computedRows.length ? (
            <TelemetryVariantSection
              variant={null}
              device={device.data}
              measurements={computedRows}
              canEdit={canEdit}
              canArchive={canArchive}
              onViewChart={onViewChart}
            />
          ) : null}
        </FramePanel>
      </Frame>
      {device.data && meshOwnerId ? (
        <PostprocessingsPanel
          deviceUuid={device.data.uuid}
          meshOwnerId={meshOwnerId}
          measurements={seen.data ?? []}
          canEdit={canEdit}
        />
      ) : null}
      {device.data ? <DeviceTrafficFrame device={device.data} /> : null}
      {device.data ? <DeviceLinksFrame device={device.data} /> : null}
      {device.data ? <DeviceTrackFrame device={device.data} /> : null}
    </>
  );
}

function qualityHeadlineKpis(
  quality: DeviceQualityResponse,
  formatMessage: IntlShape["formatMessage"],
  formatRatio: Formatters["formatRatio"],
  { withAlarms }: { withAlarms: boolean },
): { label: string; value: string; hint: string }[] {
  const alarms = Object.entries(quality.alarms_by_detector);
  const alarmCount = alarms.reduce((sum, [, n]) => sum + n, 0);
  const alarmHint =
    alarmCount === 0
      ? formatMessage({ id: "page.devices.detail.quality.kpi.noAlarms", defaultMessage: "No detector alarms" })
      : alarms
          .filter(([, n]) => n > 0)
          .map(([detector, n]) => `${detector.replaceAll("_", " ")} ${n}`)
          .join(" · ");
  const ratios = quality.channels
    .map((row) => row.completeness_ratio)
    .filter((n): n is number => n != null && Number.isFinite(n));
  const completeness = ratios.length ? ratios.reduce((sum, n) => sum + n, 0) / ratios.length : null;
  return [
    {
      label: formatMessage({ id: "page.devices.detail.quality.kpi.range", defaultMessage: "In range" }),
      value: formatRatio(quality.range_ratio),
      hint: formatMessage({
        id: "page.devices.detail.quality.kpi.rangeHint",
        defaultMessage: "Readings inside the configured range",
      }),
    },
    {
      label: formatMessage({ id: "page.devices.detail.quality.kpi.completeness", defaultMessage: "Completeness" }),
      value: formatRatio(completeness),
      hint: quality.channels.length
        ? formatMessage(
            {
              id: "page.devices.detail.quality.kpi.completenessHint",
              defaultMessage: "Mean across {count} channels",
            },
            { count: quality.channels.length },
          )
        : formatMessage({ id: "page.devices.detail.quality.kpi.noChannelsHint", defaultMessage: "No channels yet" }),
    },
    ...(withAlarms
      ? [
          {
            label: formatMessage({ id: "page.devices.detail.quality.kpi.alarms", defaultMessage: "Alarms" }),
            value: String(alarmCount),
            hint: alarmHint,
          },
        ]
      : []),
  ];
}
