import type { DeviceRead } from "@mtt/contracts";
import { Map, MapArc, MapControls, MapMarker, MapRoute, MarkerContent } from "@mtt/ui/components/ui/map";
import { cx } from "@mtt/ui/utils/cx";
import { type ReactElement, useMemo } from "react";
import { MapUnsupported } from "@/components/map-unsupported";
import { deviceTitle } from "@/features/device/model";
import { FitToPoints } from "@/features/device/ui/map-fit";
import { DeviceMapPin } from "@/features/device/ui/map-pin";
import { type LinkPair, snrStrength } from "../model";
import { tokenColor } from "../token-color";

/**
 * Every positioned device, the links between them weighted by SNR, and an optional
 * highlighted route. Devices with no drawable link are faded.
 */
export function LinksMap({
  pairs,
  positions,
  devices,
  route,
  large = false,
}: {
  pairs: LinkPair[];
  positions: globalThis.Map<number, [number, number]>;
  devices: DeviceRead[];
  route: [number, number][] | null;
  large?: boolean;
}): ReactElement {
  // Links take the accent; a selected traceroute stands out in cyan over a light casing.
  const accent = tokenColor("--oa-primary", "#ff495f");
  const routeColor = tokenColor("--color-cyan-500", "#06b6d4");
  const arcs = useMemo(
    () =>
      pairs.flatMap((pair) => {
        const from = positions.get(pair.a);
        const to = positions.get(pair.b);
        return from && to ? [{ id: pair.key, from, to, strength: snrStrength(pair.snr) }] : [];
      }),
    [pairs, positions],
  );
  const linked = new Set(
    pairs.filter((pair) => positions.has(pair.a) && positions.has(pair.b)).flatMap((pair) => [pair.a, pair.b]),
  );
  const shown = devices.flatMap((device) => {
    const position = positions.get(device.node_id);
    return position ? [{ device, lng: position[0], lat: position[1] }] : [];
  });

  return (
    <div className={cx("oa-arrive oa-squircle-inset relative overflow-hidden", large ? "h-[70vh] min-h-96" : "h-96")}>
      <Map
        center={shown.length ? [shown[0]!.lng, shown[0]!.lat] : [0, 0]}
        zoom={11}
        unsupported={<MapUnsupported />}
        className="h-full w-full"
      >
        <MapControls />
        <FitToPoints points={shown} />
        <MapArc
          id="mesh-links"
          data={arcs}
          curvature={0.15}
          paint={{
            "line-color": accent,
            "line-width": ["interpolate", ["linear"], ["get", "strength"], 0, 1, 1, 4],
            "line-opacity": ["interpolate", ["linear"], ["get", "strength"], 0, 0.25, 1, 0.9],
          }}
          interactive={false}
        />
        {route && route.length > 1 ? (
          <>
            <MapRoute id="traceroute-casing" coordinates={route} color="#ffffff" width={9} opacity={0.9} interactive={false} />
            <MapRoute id="traceroute" coordinates={route} color={routeColor} width={5} opacity={1} interactive={false} />
          </>
        ) : null}
        {shown.map(({ device, lng, lat }) => (
          <MapMarker key={device.uuid} longitude={lng} latitude={lat}>
            <MarkerContent className={cx(!linked.has(device.node_id) && "opacity-40")}>
              <DeviceMapPin isGateway={device.is_gateway} label={deviceTitle(device)} deviceUuid={device.uuid} />
            </MarkerContent>
          </MapMarker>
        ))}
      </Map>
    </div>
  );
}
