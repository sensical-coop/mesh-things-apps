import { cx } from "@mtt/ui/utils";
import { useMemo, type ReactElement } from "react";
import { Map, MapArc, MapMarker, MarkerContent } from "@mtt/ui/components/ui/map";
import { DeviceDot } from "@/features/device/ui/device-dot";
import { landingHops, landingNodes } from "./mesh";
import { MapUnsupported } from "@/components/map-unsupported";

const OPEN_FREE_MAP = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

function cssToken(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function LandingGlobe({ className }: { className?: string }): ReactElement {
  const arcs = useMemo(() => {
    const byId = Object.fromEntries(landingNodes.map((node) => [node.id, node]));
    const color = cssToken("--oa-primary", "#ff495f");
    return landingHops.flatMap((hop) => {
      const from = byId[hop.from];
      const to = byId[hop.to];
      if (!from || !to) return [];
      return [{ id: hop.id, from: [from.lng, from.lat] as [number, number], to: [to.lng, to.lat] as [number, number], color }];
    });
  }, []);

  return (
    <div className={cx("pointer-events-none relative isolate h-full min-h-52 overflow-hidden", className)} aria-hidden>
      <Map
        className="absolute inset-0 h-full w-full"
        styles={OPEN_FREE_MAP}
        cooperativeGestures={false}
        dragPan={false}
        dragRotate={false}
        scrollZoom={false}
        boxZoom={false}
        doubleClickZoom={false}
        keyboard={false}
        touchZoomRotate={false}
        touchPitch={false}
        attributionControl={false}
        renderWorldCopies={false}
        center={[1.2, 40.8]}
        zoom={4.2}
        pitch={0}
        bearing={0}
        unsupported={<MapUnsupported />}
      >
        <MapArc
          data={arcs}
          curvature={0.22}
          interactive={false}
          paint={{
            "line-color": ["get", "color"],
            "line-width": 1.6,
            "line-opacity": 0.72,
          }}
        />
        {landingNodes.map((node) => (
          <MapMarker key={node.id} longitude={node.lng} latitude={node.lat}>
            <MarkerContent>
              <DeviceDot isGateway={node.gateway} />
            </MarkerContent>
          </MapMarker>
        ))}
      </Map>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-background-primary-default/90 to-transparent px-3 pb-2.5 pt-8">
        <ul className="flex items-center gap-3">
          <li className="flex items-center gap-1.5">
            <DeviceDot isGateway />
            <span className="text-caption-1-medium text-text-primary">Gateway</span>
          </li>
          <li className="flex items-center gap-1.5">
            <DeviceDot isGateway={false} />
            <span className="text-caption-1-medium text-text-primary">Node</span>
          </li>
        </ul>
        <p className="text-caption-1-regular text-text-tertiary">Map © OpenStreetMap</p>
      </div>
    </div>
  );
}
