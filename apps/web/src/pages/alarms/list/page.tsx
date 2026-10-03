import type { DeviceRead } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { RiNotificationLine, RiNotificationOffLine } from "@remixicon/react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useMemo } from "react";
import { useIntl } from "react-intl";
import { Link } from "@tanstack/react-router";
import { AlarmBellButton } from "@/features/alarm/ui/alarm-bell-button";
import { deviceRepository } from "@/features/device/repository";
import { deviceTitle } from "@/features/device/model";
import { meshRepository } from "@/features/mesh/repository";
import { canEditMesh, meshTitle } from "@/features/mesh/model";
import { useMe } from "@/features/auth/use-me";
import { StatusCopy } from "@/components/status-copy";
import { SkeletonRows } from "@/components/skeleton-rows";
import { isChartableMeasurement } from "@/lib/measurement";
import { pageHeadingClass } from "@/lib/page-heading";
import { routes } from "@/router";
import { RouterButtonLink } from "@/components/router-button-link";

type MeasurementGroup = { key: string; title: string; channel: string; label: string; detectors: string[] }[];
type VariantGroup = { key: string; title: string; measurements: MeasurementGroup };

export function AlarmsPage(): ReactElement {
  const { formatMessage } = useIntl();
  const devices = useQuery(deviceRepository.list());
  const meshes = useQuery(meshRepository.list());
  const meshNames = useMemo(
    () => new globalThis.Map((meshes.data ?? []).map((m) => [m.id, meshTitle(m)])),
    [meshes.data],
  );
  const { me } = useMe();
  // Alarms are configuration, so devices on public meshes don't belong here.
  const editableDevices = useMemo(() => {
    const editableMeshIds = new Set((meshes.data ?? []).filter((m) => canEditMesh(m, me)).map((m) => m.id));
    return (devices.data ?? []).filter((device) => editableMeshIds.has(device.mesh_id));
  }, [devices.data, meshes.data, me]);

  const measurementsQueries = useQueries({
    queries: editableDevices.map((device) => deviceRepository.measurements({ path: { device_uuid: device.uuid } })),
  });
  const variantsQueries = useQueries({
    queries: editableDevices.map((device) => deviceRepository.telemetryVariants({ path: { device_uuid: device.uuid } })),
  });

  const loading = devices.isPending || meshes.isPending || !me || measurementsQueries.some((q) => q.isPending);

  const rows = editableDevices.map((device, index) => {
    const measurements = measurementsQueries[index]?.data ?? [];
    const variants = variantsQueries[index]?.data ?? [];
    const variantById = new globalThis.Map(variants.map((v) => [v.telemetry_variant.id, v.telemetry_variant]));
    const groups = new globalThis.Map<string, VariantGroup>();
    const order: string[] = [];
    for (const row of measurements) {
      if (!isChartableMeasurement(row.measurement_type)) continue;
      const variantId = row.telemetry_variant_id;
      if (!groups.has(variantId)) {
        const tv = variantById.get(variantId);
        groups.set(variantId, {
          key: variantId,
          title:
            tv?.name ??
            tv?.payload_kind ??
            formatMessage({ id: "page.alarms.list.otherVariant", defaultMessage: "Other" }),
          measurements: [],
        });
        order.push(variantId);
      }
      groups.get(variantId)?.measurements.push({
        key: row.id,
        title: row.measurement_type.display_name ?? row.measurement_type.channel,
        channel: row.measurement_type.channel,
        label: row.measurement_type.display_name ?? row.measurement_type.channel,
        detectors: row.effective_detectors,
      });
    }
    const variantGroups = order.flatMap((id) => {
      const group = groups.get(id);
      return group ? [group] : [];
    });
    return { device, variantGroups };
  });

  // Group devices by mesh so the page reads as "mesh, then its devices"
  // instead of one long undifferentiated device list.
  const meshGroups = (() => {
    const groups = new globalThis.Map<string, { key: string; title: string; rows: typeof rows }>();
    const order: string[] = [];
    for (const row of rows) {
      const meshId = row.device.mesh_id;
      if (!groups.has(meshId)) {
        groups.set(meshId, { key: meshId, title: meshNames.get(meshId) ?? meshId, rows: [] });
        order.push(meshId);
      }
      groups.get(meshId)?.rows.push(row);
    }
    return order.flatMap((id) => {
      const group = groups.get(id);
      return group ? [group] : [];
    });
  })();

  return (
    <>
      <div className={pageHeadingClass}>
        <h1 className="min-w-0 text-title-2-medium tracking-tight text-text-primary">
          {formatMessage({ id: "page.alarms.list.title", defaultMessage: "Alarms" })}
        </h1>
      </div>
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle>
            {formatMessage({ id: "page.alarms.list.panel.title", defaultMessage: "Configured alarms" })}
          </FrameTitle>
          <FrameDescription>
            {formatMessage({
              id: "page.alarms.list.panel.description",
              defaultMessage: "Alarms can be configured per channel.",
            })}
          </FrameDescription>
        </FrameHeader>
        <FramePanel className="flex flex-col gap-8">
          {loading ? <SkeletonRows rows={3} /> : null}
          {!loading && !rows.length ? (
            <StatusCopy>
              {formatMessage({ id: "page.alarms.list.empty", defaultMessage: "No devices registered yet." })}
            </StatusCopy>
          ) : null}
          {!loading
            ? meshGroups.map((meshGroup) => (
                <div key={meshGroup.key} className="flex flex-col gap-4">
                  <h2 className="min-w-0 break-words text-title-3-medium text-text-primary">{meshGroup.title}</h2>
                  {meshGroup.rows.map(({ device, variantGroups }) => (
                    <div key={device.uuid} className="flex flex-col gap-3 pl-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          to={routes.device}
                          params={{ deviceUuid: device.uuid }}
                          className="min-w-0 break-words text-body-medium text-text-primary hover:text-accent-500"
                        >
                          {deviceTitle(device)}
                        </Link>
                        <div className="flex gap-2">
                          <RouterButtonLink to={routes.device} params={{ deviceUuid: device.uuid }} size="xs" variant="secondary">
                            {formatMessage({ id: "page.alarms.list.open", defaultMessage: "Open" })}
                          </RouterButtonLink>
                          <DeviceAlarmsToggle device={device} />
                        </div>
                      </div>
                      {variantGroups.length ? (
                        variantGroups.map((group) => (
                          <div key={group.key} className="flex flex-col gap-2 pl-4">
                            <h4 className="min-w-0 break-words text-caption-1-medium text-text-secondary">
                              {group.title}
                            </h4>
                            <div className="oa-arrive overflow-x-auto">
                              <table className="w-full min-w-[32rem] table-fixed caption-bottom text-left text-body-2-regular">
                                <thead>
                                  <tr>
                                    <th className="h-8 w-72 break-words px-3.5 text-left align-middle text-caption-1-medium text-text-secondary">
                                      {formatMessage({
                                        id: "page.alarms.list.columns.measurement",
                                        defaultMessage: "Measurement",
                                      })}
                                    </th>
                                    <th className="h-8 px-3.5 text-left align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                                      {formatMessage({
                                        id: "page.alarms.list.columns.detectors",
                                        defaultMessage: "Active detectors",
                                      })}
                                    </th>
                                    <th className="h-8 px-3.5 text-right align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                                      {formatMessage({
                                        id: "page.alarms.list.columns.actions",
                                        defaultMessage: "Actions",
                                      })}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.measurements.map((m) => (
                                    <tr key={m.key} className="text-text-primary hover:bg-background-primary-hover">
                                      <td className="h-8 w-72 break-words px-3.5 py-0 align-middle">{m.title}</td>
                                      <td className="h-8 px-3.5 py-0 align-middle whitespace-nowrap text-text-secondary">
                                        {m.detectors.length
                                          ? m.detectors.join(", ")
                                          : formatMessage({ id: "page.alarms.list.none", defaultMessage: "None" })}
                                      </td>
                                      <td className="h-8 px-3.5 py-0 align-middle whitespace-nowrap text-right">
                                        <AlarmBellButton deviceUuid={device.uuid} channel={m.channel} label={m.label} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))
                      ) : (
                        <StatusCopy>
                          {formatMessage({
                            id: "page.alarms.list.noMeasurements",
                            defaultMessage: "No measurements discovered for this device yet.",
                          })}
                        </StatusCopy>
                      )}
                    </div>
                  ))}
                </div>
              ))
            : null}
        </FramePanel>
      </Frame>
    </>
  );
}

// Directly toggles Device.absence_detection_enabled — fires only when this
// device stops publishing entirely. Per-channel detectors are unaffected
// and keep running either way, so this is a plain toggle, not a
// confirm-guarded bulk action.
function DeviceAlarmsToggle({ device }: { device: DeviceRead }): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const update = useMutation(deviceRepository.update());

  function onClick() {
    update.mutate(
      {
        path: { device_uuid: device.uuid },
        body: { absence_detection_enabled: !device.absence_detection_enabled },
      },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: deviceRepository.listKey() }) },
    );
  }

  return (
    <Button
      type="button"
      size="xs"
      variant="secondary"
      leadingIcon={device.absence_detection_enabled ? RiNotificationLine : RiNotificationOffLine}
      disabled={update.isPending}
      onClick={onClick}
    >
      {device.absence_detection_enabled
        ? formatMessage({ id: "page.alarms.list.alarmsEnabled", defaultMessage: "Absence detection on" })
        : formatMessage({ id: "page.alarms.list.alarmsDisabled", defaultMessage: "Absence detection off" })}
    </Button>
  );
}
