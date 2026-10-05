import type {
  DeviceMeasurement,
  DeviceQualityResponse,
  DeviceRead,
  DeviceTelemetryVariant,
  LatestReading,
  MeasurementTypeRead,
} from "@mtt/contracts";
import { buttonStyles } from "@mtt/ui/components/base/buttons/button";
import { cx } from "@mtt/ui/utils/cx";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { Link, notFound, useParams } from "@tanstack/react-router";
import { RiArrowLeftLine } from "@remixicon/react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useIntl, type IntlShape } from "react-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@mtt/ui/components/ui/tabs";
import { useFormatters, type Formatters } from "@/hooks/use-formatters";
import { meshRepository } from "@/features/mesh/repository";
import { canEditMesh, meshTitle } from "@/features/mesh/model";
import { useMe } from "@/features/auth/use-me";
import { readingsRepository } from "@/features/readings/repository";
import { isNotFoundError } from "@/lib/not-found";
import { routes } from "@/router";
import { Kpi } from "@/components/kpi/kpi";
import { KpiPanel } from "@/components/kpi/kpi-panel";
import { kpiIconFor } from "@/components/kpi/kpi-icon";
import { AlarmBellButton } from "@/features/alarm/ui/alarm-bell-button";
import { canArchiveDevice } from "@/features/archive/model";
import { ArchiveButton } from "@/features/archive/ui/archive-button";
import { DeviceCsvButton } from "@/features/export/ui/device-csv-button";
import { ChannelActionsMenu } from "@/features/device/ui/channel-actions-menu";
import { SeriesChart } from "@/components/series/series-chart";
import { parseWindowMs } from "@/components/series/fill-gaps";
import { channelShortName, isChartableMeasurement, isDerivedMeasurement } from "@/lib/measurement";
import { ComputedFlag } from "@/components/computed-flag";
import { SettingsButton } from "@/components/settings-button";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { chartRangeQuery, defaultChartRange, windowForSpanMs, type DeviceChartRange } from "./chart-range";
import { CHART_AGG_OPTIONS, availableResolutions, type ChartAgg } from "./chart-resolution";
import { DeviceChartResolutionPicker } from "./chart-resolution-picker";
import { deviceRepository } from "@/features/device/repository";
import { deviceLastSeen, deviceTitle } from "@/features/device/model";
import { DeviceAllowedBadge } from "@/features/device/ui/allowed-badge";
import { DeviceChartRangePicker } from "./chart-range-picker";
import { DeviceRoleBadge } from "@/features/device/ui/role-badge";
import { DeviceLocationFrame } from "@/features/device/ui/location-frame";
import { DeviceSettingsDialog } from "@/features/device/ui/settings-dialog";
import { PostprocessingsPanel } from "@/features/postprocessing/ui/postprocessings-panel";
import { DeviceSilentBadge } from "@/features/device/ui/silent-badge";

const DEVICE_TABS = ["status", "dashboard"] as const;

function chartAnchorId(channel: string): string {
  return `chart-${channel}`;
}

export function DeviceDetailPage(): ReactElement {
  const { formatMessage } = useIntl();
  const { deviceUuid } = useParams({ from: routes.device });
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(DEVICE_TABS).withDefault("status"));
  const device = useQuery(deviceRepository.retrieve({ path: { device_uuid: deviceUuid } }));
  if (isNotFoundError(device.error)) throw notFound();
  const mesh = useQuery({
    ...meshRepository.retrieve({
      path: { mesh_id: device.data?.mesh_id ?? "00000000-0000-4000-8000-000000000000" },
    }),
    enabled: Boolean(device.data?.mesh_id),
  });
  const catalog = useQuery(readingsRepository.catalog());
  const seen = useQuery(deviceRepository.measurements({ path: { device_uuid: deviceUuid } }));
  const variants = useQuery(deviceRepository.telemetryVariants({ path: { device_uuid: deviceUuid } }));
  const latest = useQuery(readingsRepository.latest({ path: { device_uuid: deviceUuid } }));
  const quality = useQuery(
    readingsRepository.quality({
      path: { device_uuid: deviceUuid },
      query: { start: "-24h" },
    }),
  );
  const names = useMemo(
    () => new globalThis.Map((catalog.data ?? []).map((m: MeasurementTypeRead) => [m.channel, m])),
    [catalog.data],
  );
  const { me } = useMe();
  // A device on someone else's public mesh is read-only: no settings, no alarms.
  // False until the mesh loads, so write chrome never flashes for a viewer.
  const canEdit = mesh.data != null && canEditMesh(mesh.data, me);
  // Only on an operator's mesh, and only for its owner or a superuser.
  const canArchive = device.data != null && canEdit && canArchiveDevice(device.data, me, mesh.data?.owner_id);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scrollToChannel, setScrollToChannel] = useState<string | null>(null);

  function handleViewChart(channel: string) {
    setScrollToChannel(channel);
    void setTab("dashboard");
  }

  const chartChannels = useMemo(() => {
    const fromLatest = (latest.data?.readings ?? [])
      .filter((reading) => isChartableMeasurement(reading))
      .map((reading) => reading.channel);
    const fromSeen = (seen.data ?? [])
      .filter((row) => isChartableMeasurement(row.measurement_type))
      .map((row) => row.measurement_type.channel);
    return [...new Set([...fromLatest, ...fromSeen])];
  }, [latest.data, seen.data]);

  const latestKpis = useMemo(
    () => (latest.data?.readings ?? []).filter((reading) => isChartableMeasurement(reading)),
    [latest.data],
  );

  // Shared by every grouping below: each channel belongs to exactly one
  // telemetry variant, discovered via `seen` (the per-device measurement
  // list, which is the only place carrying telemetry_variant_id).
  const variantIdByChannel = useMemo(
    () => new globalThis.Map((seen.data ?? []).map((row) => [row.measurement_type.channel, row.telemetry_variant_id])),
    [seen.data],
  );
  const variantById = useMemo(
    () => new globalThis.Map((variants.data ?? []).map((row) => [row.telemetry_variant.id, row.telemetry_variant])),
    [variants.data],
  );

  // Channels a blueprint derives get a group of their own, after what the device reports.
  const groupTitle = useCallback(
    (variantId: string): string => {
      if (variantId === COMPUTED_GROUP) {
        return formatMessage({ id: "page.devices.detail.computedGroup", defaultMessage: "Computed" });
      }
      const tv = variantId ? variantById.get(variantId) : undefined;
      return (
        tv?.name ??
        tv?.payload_kind ??
        formatMessage({ id: "page.devices.detail.dashboard.latest.other", defaultMessage: "Other" })
      );
    },
    [variantById, formatMessage],
  );

  const latestGroups = useMemo<LatestKpiGroup[]>(() => {
    const groups = new globalThis.Map<string, LatestKpiGroup>();
    const order: string[] = [];
    for (const reading of latestKpis) {
      const variantId = isDerivedMeasurement(reading) ? COMPUTED_GROUP : (variantIdByChannel.get(reading.channel) ?? "");
      if (!groups.has(variantId)) {
        groups.set(variantId, { key: variantId || "other", title: groupTitle(variantId), readings: [] });
        order.push(variantId);
      }
      groups.get(variantId)?.readings.push(reading);
    }
    return computedLast(order).flatMap((id) => {
      const group = groups.get(id);
      return group ? [group] : [];
    });
  }, [latestKpis, variantIdByChannel, groupTitle]);

  // Same grouping, applied to the History section's chart channels.
  const chartChannelGroups = useMemo<ChartChannelGroup[]>(() => {
    const groups = new globalThis.Map<string, ChartChannelGroup>();
    const order: string[] = [];
    for (const channel of chartChannels) {
      const variantId = isDerivedMeasurement({ channel }) ? COMPUTED_GROUP : (variantIdByChannel.get(channel) ?? "");
      if (!groups.has(variantId)) {
        groups.set(variantId, { key: variantId || "other", title: groupTitle(variantId), channels: [] });
        order.push(variantId);
      }
      groups.get(variantId)?.channels.push(channel);
    }
    return computedLast(order).flatMap((id) => {
      const group = groups.get(id);
      return group ? [group] : [];
    });
  }, [chartChannels, variantIdByChannel, groupTitle]);

  return (
    <>
      {device.data && canEdit ? (
        <DeviceSettingsDialog
          device={device.data}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
      <Tabs
        className="flex flex-col gap-0"
        value={tab}
        onValueChange={(value) => {
          if (value === "status" || value === "dashboard") void setTab(value);
        }}
      >
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              to={routes.devices}
              aria-label={formatMessage({ id: "page.devices.detail.back", defaultMessage: "Back to devices" })}
              className={cx(
                buttonStyles.base,
                buttonStyles.size.small,
                buttonStyles.variant.ghost,
                buttonStyles.iconOnlySize.small,
                "shrink-0 rounded-full",
              )}
            >
              <RiArrowLeftLine className={buttonStyles.icon.small} aria-hidden />
            </Link>
            <div className="flex min-w-0 flex-col gap-1">
              {mesh.data ? (
                <p className="text-caption-1-regular text-text-secondary">
                  <Link to={routes.mesh} params={{ meshId: mesh.data.id }} className="hover:text-text-primary">
                    {meshTitle(mesh.data)}
                  </Link>
                </p>
              ) : null}
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="min-w-0 text-balance break-words text-title-2-medium tracking-tight text-text-primary">
                  {device.data
                    ? deviceTitle(device.data)
                    : formatMessage({ id: "page.devices.detail.fallbackTitle", defaultMessage: "Device" })}
                </h1>
                {device.data ? <DeviceRoleBadge device={device.data} /> : null}
                {device.data ? <DeviceSilentBadge device={device.data} /> : null}
              </div>
            </div>
          </div>
          {device.data && canEdit ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <DeviceCsvButton device={device.data} />
              <SettingsButton
                size="small"
                className="shrink-0"
                label={formatMessage({ id: "page.devices.detail.editSettings", defaultMessage: "Edit settings" })}
                onClick={() => setSettingsOpen(true)}
              />
            </div>
          ) : null}
        </div>
        <TabsList className="mt-3 p-1">
          <TabsTrigger value="status" className="px-4 py-1.5 text-body-medium">
            {formatMessage({ id: "page.devices.detail.tabs.status", defaultMessage: "Status" })}
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="px-4 py-1.5 text-body-medium">
            {formatMessage({ id: "page.devices.detail.tabs.dashboard", defaultMessage: "Dashboard" })}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="status" keepMounted className="mt-6 flex flex-col gap-6">
          <DeviceStatusTab
            device={device}
            quality={quality}
            variants={variants}
            seen={seen}
            names={names}
            canEdit={canEdit}
            canArchive={canArchive}
            meshOwnerId={mesh.data?.owner_id}
            onViewChart={handleViewChart}
          />
        </TabsContent>
        <TabsContent value="dashboard" className="mt-6 flex flex-col gap-6">
          <DeviceDashboardTab
            deviceUuid={deviceUuid}
            device={device.data}
            ready={Boolean(device.data)}
            latestPending={latest.isPending}
            latestGroups={latestGroups}
            chartChannels={chartChannels}
            chartChannelGroups={chartChannelGroups}
            names={names}
            canEdit={canEdit}
            canArchive={canArchive}
            scrollToChannel={scrollToChannel}
            onScrolled={() => setScrollToChannel(null)}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

type NamesByChannel = Map<string, MeasurementTypeRead>;

const COMPUTED_GROUP = "computed";

function computedLast(order: string[]): string[] {
  return [...order.filter((id) => id !== COMPUTED_GROUP), ...order.filter((id) => id === COMPUTED_GROUP)];
}
type LatestKpiGroup = { key: string; title: string; readings: LatestReading[] };
type ChartChannelGroup = { key: string; title: string; channels: string[] };

function DeviceStatusTab({
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
  device: UseQueryResult<DeviceRead>;
  quality: UseQueryResult<DeviceQualityResponse>;
  variants: UseQueryResult<DeviceTelemetryVariant[]>;
  seen: UseQueryResult<DeviceMeasurement[]>;
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
              <dl className="oa-arrive grid gap-3 sm:grid-cols-2">
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
                <div key={slot} className="oa-squircle-inset h-24 bg-background-primary-default" />
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
              <div className={cx("oa-arrive grid gap-3", qualityCols)} role="group" aria-label="Quality summary">
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
                            <td className="pe-2 py-1.5 text-text-primary">
                              {names.get(row.channel)?.display_name ?? row.channel}
                            </td>
                            <td className="px-2 py-1.5 tabular-nums text-text-primary">
                              {formatRatio(row.completeness_ratio)}
                            </td>
                            <td className="px-2 py-1.5 tabular-nums text-text-secondary">
                              {row.observed ?? "—"} / {row.expected ?? "—"}
                            </td>
                            <td className="ps-2 py-1.5 tabular-nums text-text-secondary">
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
    </>
  );
}

function TelemetryVariantSection({
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
          <h3 className="flex min-w-0 items-center gap-2 break-words text-body-medium text-text-primary">
            {tv
              ? (tv.name ?? tv.payload_kind)
              : formatMessage({ id: "page.devices.detail.computedGroup", defaultMessage: "Computed" })}
          </h3>
          {variant && tv ? (
            <span className="min-w-0 break-words text-caption-1-regular text-text-secondary">
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
            <span className="min-w-0 break-words text-caption-1-regular text-text-secondary">
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
              canArchive ? "min-w-[57rem]" : "min-w-[52rem]",
            )}
          >
            <thead>
              <tr>
                <th className="h-8 w-72 break-words px-3.5 text-left align-middle text-caption-1-medium text-text-secondary">
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
                    <td className="h-8 w-72 break-words px-3.5 py-0 align-middle">
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
                    <td className="h-8 break-words px-3.5 py-0 align-middle text-text-secondary">
                      {formatLastSeen(row.last_seen)}
                    </td>
                    <td className="h-8 px-3.5 py-0 align-middle whitespace-nowrap text-left">
                      <a
                        href={`#${chartAnchorId(channel)}`}
                        onClick={(event) => {
                          event.preventDefault();
                          onViewChart(channel);
                        }}
                        className="rounded-full text-caption-1-medium text-accent-500 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                      >
                        {formatMessage({
                          id: "page.devices.detail.variants.viewChart",
                          defaultMessage: "View chart",
                        })}
                      </a>
                    </td>
                    {canEdit ? (
                      <td className="h-8 px-3.5 py-0 align-middle whitespace-nowrap text-right">
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
                      <td className="h-8 px-3.5 py-0 align-middle whitespace-nowrap text-right">
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

function DeviceDashboardTab({
  deviceUuid,
  device,
  ready,
  latestPending,
  latestGroups,
  chartChannels,
  chartChannelGroups,
  names,
  canEdit,
  canArchive,
  scrollToChannel,
  onScrolled,
}: {
  deviceUuid: string;
  device: DeviceRead | undefined;
  ready: boolean;
  latestPending: boolean;
  latestGroups: LatestKpiGroup[];
  chartChannels: string[];
  chartChannelGroups: ChartChannelGroup[];
  names: NamesByChannel;
  canEdit: boolean;
  canArchive: boolean;
  scrollToChannel: string | null;
  onScrolled: () => void;
}): ReactElement {
  const { formatMessage } = useIntl();
  const { formatValue, formatWhen } = useFormatters();
  const [range, setRange] = useState<DeviceChartRange>(defaultChartRange);
  const rangeQuery = chartRangeQuery(range);
  const [resolution, setResolution] = useState(() => windowForSpanMs(range.spanMs));
  const [agg, setAgg] = useState<ChartAgg>("mean");

  // The resolution ladder is bounded by the selected range (so a 30-day range
  // can't be asked for at 1-minute buckets); when the range grows/shrinks past
  // what the current resolution supports, fall back to that range's default.
  useEffect(() => {
    const valid = availableResolutions(range.spanMs);
    if (!valid.some((option) => option.value === resolution)) {
      setResolution(windowForSpanMs(range.spanMs));
    }
  }, [range.spanMs, resolution]);

  const windowMs = parseWindowMs(resolution);
  const seriesQueries = useQueries({
    queries: chartChannels.map((channel) => ({
      ...readingsRepository.series({
        path: { device_uuid: deviceUuid },
        query: {
          channel,
          start: rangeQuery.start,
          stop: rangeQuery.stop,
          window: resolution,
          agg,
        },
      }),
      enabled: ready,
    })),
  });

  useEffect(() => {
    if (!scrollToChannel || !chartChannels.includes(scrollToChannel)) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(chartAnchorId(scrollToChannel))?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    onScrolled();
    return () => cancelAnimationFrame(frame);
  }, [scrollToChannel, chartChannels, onScrolled]);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4" aria-label="Latest readings">
        <div className="flex flex-col gap-1">
          <h2 className="text-title-3-medium text-text-primary">
            {formatMessage({ id: "page.devices.detail.dashboard.latest.title", defaultMessage: "Latest readings" })}
          </h2>
          <p className="text-body-regular text-text-secondary">
            {formatMessage({
              id: "page.devices.detail.dashboard.latest.description",
              defaultMessage: "Current values from this device.",
            })}
          </p>
        </div>
        {latestPending ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
            {["a", "b", "c", "d"].map((slot) => (
              <div key={slot} className="oa-squircle-inset h-24 bg-background-primary-default" />
            ))}
          </div>
        ) : null}
        {latestGroups.length ? (
          <div className="oa-arrive flex flex-col gap-5">
            {latestGroups.map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <h3 className="min-w-0 break-words text-body-medium text-text-primary">{group.title}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label={group.title}>
                  {group.readings.map((reading) => {
                    const type = names.get(reading.channel);
                    const unit = reading.unit ?? type?.native_unit;
                    return (
                      <Kpi
                        key={reading.channel}
                        icon={kpiIconFor(`${reading.field_name} ${reading.channel}`)}
                        label={reading.field_name}
                        value={`${formatValue(reading.value)}${unit ? ` ${unit}` : ""}`}
                        hint={formatWhen(reading.time)}
                        badge={isDerivedMeasurement(reading) ? <ComputedFlag /> : undefined}
                        action={
                          canArchive && device ? (
                            <ChannelActionsMenu device={device} channel={reading.channel} label={reading.field_name} />
                          ) : canEdit ? (
                            <AlarmBellButton deviceUuid={deviceUuid} channel={reading.channel} label={reading.field_name} />
                          ) : undefined
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          !latestPending && (
            <StatusCopy>
              {formatMessage({
                id: "page.devices.detail.dashboard.latest.none",
                defaultMessage: "No readings found.",
              })}
            </StatusCopy>
          )
        )}
      </section>

      <section className="flex flex-col gap-6" aria-label="Historical series">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-title-3-medium text-text-primary">
              {formatMessage({ id: "page.devices.detail.dashboard.history.title", defaultMessage: "History" })}
            </h2>
            <p className="text-body-regular text-text-secondary">
              {formatMessage({
                id: "page.devices.detail.dashboard.history.description",
                defaultMessage: "Values per channel for the selected range, resolution, and aggregation.",
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DeviceChartResolutionPicker
              spanMs={range.spanMs}
              resolution={resolution}
              onResolutionChange={setResolution}
              agg={agg}
              onAggChange={setAgg}
            />
            <DeviceChartRangePicker value={range} onChange={setRange} />
          </div>
        </div>
        {chartChannelGroups.length ? (
          <div className="oa-arrive flex flex-col gap-6">
            {chartChannelGroups.map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <h3 className="min-w-0 break-words text-body-medium text-text-primary">{group.title}</h3>
                <div className="grid items-start gap-3 sm:grid-cols-2">
                  {group.channels.map((channel) => {
                    const index = chartChannels.indexOf(channel);
                    const series = seriesQueries[index];
                    const type = names.get(channel);
                    const points = series?.data?.series[0]?.points;
                    // Same name as the latest-reading card above it.
                    const label = channelShortName(channel);
                    const computed = isDerivedMeasurement({ channel });
                    const badge = computed ? <ComputedFlag /> : undefined;
                    // CHART_AGG_OPTIONS covers every ChartAgg value, so this always matches.
                    const aggOption = CHART_AGG_OPTIONS.find((option) => option.value === agg)!;
                    const aggLabel = formatMessage({ id: aggOption.messageId, defaultMessage: aggOption.label });
                    const hint = type?.native_unit
                      ? formatMessage(
                          { id: "page.devices.detail.dashboard.history.aggHint", defaultMessage: "{agg} · {unit}" },
                          { agg: aggLabel, unit: type.native_unit },
                        )
                      : aggLabel;
                    const icon = kpiIconFor(`${type?.field_name ?? ""} ${channel}`);
                    let content: ReactElement;
                    if (series?.isPending) {
                      content = (
                        <KpiPanel label={label} hint={hint} icon={icon} badge={badge} className="min-h-52" aria-hidden>
                          <SkeletonRows rows={5} />
                        </KpiPanel>
                      );
                    } else if (series?.error) {
                      content = (
                        <KpiPanel label={label} hint={hint} icon={icon} badge={badge} className="min-h-52 justify-center">
                          <StatusCopy>
                            {formatMessage({
                              id: "page.devices.detail.dashboard.history.seriesError",
                              defaultMessage: "This series did not load.",
                            })}
                          </StatusCopy>
                        </KpiPanel>
                      );
                    } else if (!points?.length) {
                      content = (
                        <KpiPanel label={label} hint={hint} icon={icon} badge={badge} className="min-h-52 justify-center">
                          <StatusCopy>
                            {formatMessage({
                              id: "page.devices.detail.dashboard.history.noPoints",
                              defaultMessage: "No points in this range for this channel.",
                            })}
                          </StatusCopy>
                        </KpiPanel>
                      );
                    } else {
                      content = (
                        <SeriesChart
                          label={label}
                          hint={hint}
                          icon={icon}
                          badge={badge}
                          computed={computed}
                          points={points}
                          windowMs={windowMs}
                          className="min-h-52"
                        />
                      );
                    }
                    return (
                      <div key={channel} id={chartAnchorId(channel)} className="scroll-mt-6">
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          !latestPending && (
            <StatusCopy>
              {formatMessage({
                id: "page.devices.detail.dashboard.history.none",
                defaultMessage: "No measured series on this device yet.",
              })}
            </StatusCopy>
          )
        )}
      </section>
    </div>
  );
}

/** Status tab: headline signals only; per-channel detail lives in the table below. */
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

function formatGapShort(seconds: number | null, formatMessage: IntlShape["formatMessage"]): string {
  if (seconds == null || !Number.isFinite(seconds)) {
    return formatMessage({ id: "common.format.emDash", defaultMessage: "—" });
  }
  if (seconds < 60) {
    return formatMessage(
      { id: "page.devices.detail.quality.gapSeconds", defaultMessage: "{count}s" },
      { count: Math.round(seconds) },
    );
  }
  return formatMessage(
    { id: "page.devices.detail.quality.gapMinutes", defaultMessage: "{count} min" },
    { count: Math.round(seconds / 60) },
  );
}

function Item({ label, value }: { label: string; value: ReactElement | string }): ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption-1-medium text-text-secondary">{label}</dt>
      <dd className="min-w-0 break-words text-body-medium text-text-primary">{value}</dd>
    </div>
  );
}
