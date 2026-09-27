import { useMap } from "@mtt/ui/components/ui/map";
import { useEffect, useRef } from "react";

export type FitToPointsProps = {
  points: { lng: number; lat: number }[];
  /** Zoom used for a single point, and the cap when points sit close together. */
  maxZoom?: number;
};

// Frames every point, not just the first. Snaps on the first fit so the map
// never visibly jumps on arrival; later changes ease.
export function FitToPoints({ points, maxZoom = 15 }: FitToPointsProps): null {
  const { map } = useMap();
  const fitted = useRef(false);
  const key = points.map((p) => `${p.lng},${p.lat}`).join(";");
  useEffect(() => {
    if (!map || points.length === 0) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = fitted.current && !reduce ? 600 : 0;
    fitted.current = true;
    const lngs = points.map((p) => p.lng);
    const lats = points.map((p) => p.lat);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 48, maxZoom, duration },
    );
    // `key` stands in for `points`, whose identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key, maxZoom]);
  return null;
}
