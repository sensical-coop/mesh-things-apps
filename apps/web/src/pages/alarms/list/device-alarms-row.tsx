import type { DeviceRead, TelemetryVariantRead } from "@mtt/contracts";
import { RiArrowDownSLine, RiArrowRightSLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, useMemo } from "react";
import { useIntl } from "react-intl";
import { RouterButtonLink } from "@/components/router-button-link";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { alarmVariantGroups } from "@/features/alarm/model";
import { variantGroupTitle } from "@/features/device/variant-groups";
import { AlarmBellButton } from "@/features/alarm/ui/alarm-bell-button";
import { deviceTitle } from "@/features/device/model";
import { deviceRepository } from "@/features/device/repository";
import { DeviceKindBadge } from "@/features/device/ui/kind-badge";
import { routes } from "@/router";
import { DeviceAbsenceToggle } from "./device-absence-toggle";

type DeviceAlarmsRowProps = {
  device: DeviceRead;
  variants: readonly TelemetryVariantRead[];
  expanded: boolean;
  onToggle: () => void;
};

/**
 * One device on the alarms list. Its channels are fetched only once it's expanded,
 * so a large mesh costs one request per device someone actually opens.
 */
export function DeviceAlarmsRow({ device, variants, expanded, onToggle }: DeviceAlarmsRowProps): ReactElement {
  const { formatMessage } = useIntl();
  const measurements = useQuery({
    ...deviceRepository.measurements(device.uuid),
    enabled: expanded,
  });
  const groups = useMemo(() => alarmVariantGroups(measurements.data ?? []), [measurements.data]);
  const variantById = useMemo(() => new Map(variants.map((variant) => [variant.id, variant])), [variants]);
  const channelsId = `alarm-channels-${device.uuid}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex min-w-0 items-center gap-1.5 rounded-full text-start text-body-medium text-text-primary outline-hidden hover:text-accent-500 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            aria-expanded={expanded}
            aria-controls={channelsId}
            onClick={onToggle}
          >
            {expanded ? (
              <RiArrowDownSLine className="size-4 shrink-0" aria-hidden />
            ) : (
              <RiArrowRightSLine className="size-4 shrink-0" aria-hidden />
            )}
            <span className="min-w-0 wrap-break-word">{deviceTitle(device)}</span>
          </button>
          <DeviceKindBadge isGateway={device.is_gateway} />
        </div>
        <div className="flex gap-2">
          <RouterButtonLink to={routes.device} params={{ deviceUuid: device.uuid }} size="xs" variant="secondary">
            {formatMessage({ id: "common.actions.open", defaultMessage: "Open" })}
          </RouterButtonLink>
          <DeviceAbsenceToggle device={device} />
        </div>
      </div>
      {expanded ? (
        <div id={channelsId} className="flex flex-col gap-3 pl-6">
          {measurements.isPending ? <SkeletonRows rows={2} /> : null}
          {measurements.isError ? (
            <StatusCopy>
              {formatMessage({
                id: "page.alarms.list.measurementsError",
                defaultMessage: "Channels didn't load. Collapse and expand the device to try again.",
              })}
            </StatusCopy>
          ) : null}
          {measurements.isSuccess && !groups.length ? (
            <StatusCopy>
              {formatMessage({
                id: "page.alarms.list.noMeasurements",
                defaultMessage: "No measurements discovered for this device yet.",
              })}
            </StatusCopy>
          ) : null}
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-2">
              <h4 className="min-w-0 text-caption-1-medium wrap-break-word text-text-secondary">
                {variantGroupTitle(group.key, variantById.get(group.key), formatMessage)}
              </h4>
              <div className="oa-arrive overflow-x-auto">
                <table className="w-full min-w-lg table-fixed caption-bottom text-left text-body-2-regular">
                  <thead>
                    <tr>
                      <th className="h-8 w-72 px-3.5 text-left align-middle text-caption-1-medium wrap-break-word text-text-secondary">
                        {formatMessage({ id: "page.alarms.list.columns.measurement", defaultMessage: "Measurement" })}
                      </th>
                      <th className="h-8 px-3.5 text-left align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                        {formatMessage({ id: "page.alarms.list.columns.detectors", defaultMessage: "Active detectors" })}
                      </th>
                      <th className="h-8 px-3.5 text-right align-middle text-caption-1-medium whitespace-nowrap text-text-secondary">
                        {formatMessage({ id: "page.alarms.list.columns.actions", defaultMessage: "Actions" })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.channels.map((channel) => (
                      <tr key={channel.key} className="text-text-primary hover:bg-background-primary-hover">
                        <td className="h-8 w-72 px-3.5 py-0 align-middle wrap-break-word">{channel.label}</td>
                        <td className="h-8 px-3.5 py-0 align-middle whitespace-nowrap text-text-secondary">
                          {channel.detectors.length
                            ? channel.detectors.join(", ")
                            : formatMessage({ id: "page.alarms.list.none", defaultMessage: "None" })}
                        </td>
                        <td className="h-8 px-3.5 py-0 text-right align-middle whitespace-nowrap">
                          <AlarmBellButton deviceUuid={device.uuid} channel={channel.channel} label={channel.label} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
