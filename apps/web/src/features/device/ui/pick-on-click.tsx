import { useMap } from "@mtt/ui/components/ui/map";
import { useEffect, useRef } from "react";

type LngLat = { lng: number; lat: number };

export function PickOnClick({ onPick }: { onPick: (point: LngLat) => void }): null {
  const { map } = useMap();
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  useEffect(() => {
    if (!map) return;
    const canvas = map.getCanvas();
    const handleClick = (event: { lngLat: LngLat }) => onPickRef.current(event.lngLat);
    map.on("click", handleClick);
    canvas.style.cursor = "crosshair";
    return () => {
      map.off("click", handleClick);
      canvas.style.cursor = "";
    };
  }, [map]);
  return null;
}
