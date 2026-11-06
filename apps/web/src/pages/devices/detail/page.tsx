import type {
  MeasurementTypeRead,
} from "@mtt/contracts";
import { buttonStyles } from "@mtt/ui/components/base/buttons/button";
import { cx } from "@mtt/ui/utils/cx";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, useCallback, useMemo, useState } from "react";
import { Link, notFound, useParams } from "@tanstack/react-router";
import { RiArrowLeftLine } from "@remixicon/react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useIntl } from "react-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@mtt/ui/components/ui/tabs";
import { meshRepository } from "@/features/mesh/repository";
import { canEditMesh, meshTitle } from "@/features/mesh/model";
import { useMe } from "@/features/auth/use-me";
import { readingsRepository } from "@/features/readings/repository";
import { isNotFoundError } from "@/lib/not-found";
import { routes } from "@/router";
import { canArchiveDevice } from "@/features/archive/model";
import { DeviceCsvButton } from "@/features/export/ui/device-csv-button";
import { isChartableMeasurement, isDerivedMeasurement } from "@/lib/measurement";
import { COMPUTED_VARIANT_GROUP, groupByTelemetryVariant } from "@/features/device/variant-groups";
import { SettingsButton } from "@/components/settings-button";
import { deviceRepository } from "@/features/device/repository";
import { deviceTitle } from "@/features/device/model";
import { DeviceRoleBadge } from "@/features/device/ui/role-badge";
import { DeviceSettingsDialog } from "@/features/device/ui/settings-dialog";
import { DeviceSilentBadge } from "@/features/device/ui/silent-badge";

import { DeviceStatusTab } from "./device-status-tab";
import { DeviceDashboardTab, type ChartChannelGroup, type LatestKpiGroup } from "./device-dashboard-tab";

const DEVICE_TABS = ["status", "dashboard"] as const;

export function DeviceDetailPage(): ReactElement {
  const { formatMessage } = useIntl();
  const { deviceUuid } = useParams({ from: routes.device });
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(DEVICE_TABS).withDefault("status"));
  const device = useQuery(deviceRepository.retrieve(deviceUuid));
  if (isNotFoundError(device.error)) throw notFound();
  const mesh = useQuery(meshRepository.retrieve(device.data?.mesh_id));
  const catalog = useQuery(readingsRepository.catalog());
  const seen = useQuery(deviceRepository.measurements(deviceUuid));
  const variants = useQuery(deviceRepository.telemetryVariants(deviceUuid));
  const latest = useQuery(readingsRepository.latest(deviceUuid));
  const quality = useQuery(
    readingsRepository.quality(deviceUuid, {
      start: "-24h",
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
      if (variantId === COMPUTED_VARIANT_GROUP) {
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

  const latestGroups = useMemo<LatestKpiGroup[]>(
    () =>
      groupByTelemetryVariant(
        latestKpis,
        (reading) => variantIdByChannel.get(reading.channel) ?? "",
        isDerivedMeasurement,
      ).map((group) => ({ key: group.key || "other", title: groupTitle(group.key), readings: group.items })),
    [latestKpis, variantIdByChannel, groupTitle],
  );

  const chartChannelGroups = useMemo<ChartChannelGroup[]>(
    () =>
      groupByTelemetryVariant(
        chartChannels,
        (channel) => variantIdByChannel.get(channel) ?? "",
        (channel) => isDerivedMeasurement({ channel }),
      ).map((group) => ({ key: group.key || "other", title: groupTitle(group.key), channels: group.items })),
    [chartChannels, variantIdByChannel, groupTitle],
  );

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
                <h1 className="min-w-0 text-title-2-medium tracking-tight text-balance wrap-break-word text-text-primary">
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
