import { useMap } from "@mtt/ui/components/ui/map";
import { useEffect, useRef } from "react";

type LngLat = { lng: number; lat: number };

// The map's `center` only seeds the first render; follow the saved position
// when it moves afterwards (settings dialog, or a save from the picker).
export function FollowPoint({ point }: { point: LngLat | null }): null {
  const { map } = useMap();
  const lng = point?.lng;
  const lat = point?.lat;
  const first = useRef(true);
  useEffect(() => {
    if (!map || lng === undefined || lat === undefined) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14), duration: reduce ? 0 : 600 });
  }, [map, lng, lat]);
  return null;
}
