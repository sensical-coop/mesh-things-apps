import type {
  MeasurementTypeRead,
} from "@mtt/contracts";
import { buttonStyles } from "@mtt/ui/components/base/buttons/button";
import { cx } from "@mtt/ui/utils";
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
import { isChartableMeasurement } from "@/lib/measurement";
import { groupByTelemetryVariant, variantGroupTitle } from "@/features/device/variant-groups";
import { SettingsButton } from "@/components/settings-button";
import { deviceRepository } from "@/features/device/repository";
import { deviceTitle } from "@/features/device/model";
import { DeviceRoleBadge } from "@/features/device/ui/role-badge";
import { DeviceSettingsDialog } from "@/features/device/ui/settings-dialog";
import { DeviceSilentBadge } from "@/features/device/ui/silent-badge";

import { DetailHeading } from "@/components/detail-heading";
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
  const catalog = useQuery(deviceRepository.measurementCatalog());
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
    (variantId: string): string => variantGroupTitle(variantId, variantById.get(variantId), formatMessage),
    [variantById, formatMessage],
  );

  const latestGroups = useMemo<LatestKpiGroup[]>(
    () =>
      groupByTelemetryVariant(
        latestKpis,
        (reading) => variantIdByChannel.get(reading.channel) ?? "",
        (reading) => reading.channel,
      ).map((group) => ({ key: group.key || "other", title: groupTitle(group.key), readings: group.items })),
    [latestKpis, variantIdByChannel, groupTitle],
  );

  const chartChannelGroups = useMemo<ChartChannelGroup[]>(
    () =>
      groupByTelemetryVariant(
        chartChannels,
        (channel) => variantIdByChannel.get(channel) ?? "",
        (channel) => channel,
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
          const next = DEVICE_TABS.find((tabValue) => tabValue === value);
          if (next) void setTab(next);
        }}
      >
        <DetailHeading
          className="mb-0"
          leading={
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
          }
          crumb={
            mesh.data ? (
              <Link to={routes.mesh} params={{ meshId: mesh.data.id }}>
                {meshTitle(mesh.data)}
              </Link>
            ) : null
          }
          title={
            device.data
              ? deviceTitle(device.data)
              : formatMessage({ id: "page.devices.detail.fallbackTitle", defaultMessage: "Device" })
          }
          badges={
            device.data ? (
              <>
                <DeviceRoleBadge device={device.data} />
                <DeviceSilentBadge device={device.data} />
              </>
            ) : null
          }
          actions={
            device.data && canEdit ? (
              <>
                <DeviceCsvButton device={device.data} />
                <SettingsButton
                  size="small"
                  className="shrink-0"
                  label={formatMessage({ id: "common.actions.editSettings", defaultMessage: "Edit settings" })}
                  onClick={() => setSettingsOpen(true)}
                />
              </>
            ) : null
          }
        />
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
