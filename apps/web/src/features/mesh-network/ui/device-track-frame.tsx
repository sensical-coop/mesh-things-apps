import type { DeviceRead } from "@mtt/contracts";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { Map, MapControls, MapMarker, MapRoute, MarkerContent } from "@mtt/ui/components/ui/map";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, useMemo } from "react";
import { useIntl } from "react-intl";
import { MapUnsupported } from "@/components/map-unsupported";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { FitToPoints } from "@/features/device/ui/map-fit";
import { DeviceMapPin } from "@/features/device/ui/map-pin";
import { deviceTitle } from "@/features/device/model";
import { readingsRepository } from "@/features/readings/repository";
import { positionTrack } from "../model";
import { tokenColor } from "../token-color";

/** Where a device reported itself over the last week, as a track ending at its latest position. */
export function DeviceTrackFrame({ device }: { device: DeviceRead }): ReactElement {
  const { formatMessage } = useIntl();
  const positions = useQuery(
    readingsRepository.series({
      path: { device_uuid: device.uuid },
      query: { payload_kind: "device:position", start: "-7d" },
    }),
  );
  const track = useMemo(() => {
    const series = positions.data?.series ?? [];
    const channel = (name: string) => series.find((s) => s.channel === `position.${name}`)?.points ?? [];
    return positionTrack(channel("latitude"), channel("longitude"));
  }, [positions.data]);
  const last = track[track.length - 1];

  return (
    <Frame className="shadow-card">
      <FrameHeader>
        <FrameTitle>
          {formatMessage({ id: "page.devices.detail.track.title", defaultMessage: "Location history" })}
        </FrameTitle>
        <FrameDescription>
          {formatMessage(
            {
              id: "page.devices.detail.track.description",
              defaultMessage:
                "{count, plural, =0 {No positions} one {# position} other {# positions}} reported over the last 7 days.",
            },
            { count: track.length },
          )}
        </FrameDescription>
      </FrameHeader>
      <FramePanel>
        {positions.isPending ? <SkeletonRows rows={2} /> : null}
        {positions.data && track.length < 2 ? (
          <StatusCopy>
            {formatMessage({
              id: "page.devices.detail.track.none",
              defaultMessage: "A track needs at least two different positions; this device has not moved or not reported them.",
            })}
          </StatusCopy>
        ) : null}
        {track.length >= 2 && last ? (
          <div className="oa-arrive oa-squircle-inset relative h-80 overflow-hidden">
            <Map center={last} zoom={12} unsupported={<MapUnsupported />} className="h-full w-full">
              <MapControls />
              <FitToPoints points={track.map(([lng, lat]) => ({ lng, lat }))} />
              <MapRoute id="track" coordinates={track} color={tokenColor("--oa-primary", "#ff495f")} width={3} interactive={false} />
              <MapMarker longitude={last[0]} latitude={last[1]}>
                <MarkerContent>
                  <DeviceMapPin isGateway={device.is_gateway} label={deviceTitle(device)} />
                </MarkerContent>
              </MapMarker>
            </Map>
          </div>
        ) : null}
      </FramePanel>
    </Frame>
  );
}
