import type { DeviceRead } from "@mtt/contracts";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { SeriesChart } from "@/components/series/series-chart";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { readingsRepository } from "@/features/readings/repository";
import { portnumLabel, windowMs } from "../model";
import { RankedBars } from "./ranked-bars";

/** What a device transmitted over the last week, by kind of packet. */
export function DeviceTrafficFrame({ device }: { device: DeviceRead }): ReactElement {
  const { formatMessage, formatNumber } = useIntl();
  const traffic = useQuery(readingsRepository.deviceTraffic({ path: { device_uuid: device.uuid }, query: { range: "7d" } }));
  const title = formatMessage({ id: "page.devices.detail.traffic.title", defaultMessage: "Traffic" });
  return (
    <Frame className="shadow-card">
      <FrameHeader>
        <FrameTitle>{title}</FrameTitle>
        <FrameDescription>
          {traffic.data
            ? formatMessage(
                {
                  id: "page.devices.detail.traffic.description",
                  defaultMessage:
                    "{packets, plural, one {# packet} other {# packets}} sent over the last 7 days, heard {receptions, plural, one {# time} other {# times}} by the mesh's gateways.",
                },
                { packets: traffic.data.packets, receptions: traffic.data.receptions },
              )
            : formatMessage({
                id: "page.devices.detail.traffic.loading",
                defaultMessage: "Packets this device sent over the last 7 days.",
              })}
        </FrameDescription>
      </FrameHeader>
      <FramePanel>
        {traffic.isPending ? <SkeletonRows rows={2} /> : null}
        {traffic.error ? (
          <StatusCopy>
            {formatMessage({
              id: "page.devices.detail.traffic.error",
              defaultMessage: "Traffic did not load. Please check again soon.",
            })}
          </StatusCopy>
        ) : null}
        {traffic.data && traffic.data.packets === 0 ? (
          <StatusCopy>
            {formatMessage({
              id: "page.devices.detail.traffic.none",
              defaultMessage: "No packets from this device in the last 7 days.",
            })}
          </StatusCopy>
        ) : null}
        {traffic.data && traffic.data.packets > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <RankedBars
              label={title}
              rows={traffic.data.ports.map((port) => ({
                key: port.name,
                label: portnumLabel(port.name),
                value: port.packets,
                display: formatNumber(port.packets),
              }))}
            />
            <SeriesChart
              points={traffic.data.points}
              windowMs={windowMs(traffic.data.window)}
              label={formatMessage(
                { id: "page.devices.detail.traffic.chart", defaultMessage: "Packets per {window}" },
                { window: traffic.data.window },
              )}
            />
          </div>
        ) : null}
      </FramePanel>
    </Frame>
  );
}
