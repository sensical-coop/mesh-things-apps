import type { ReactElement } from "react";
import { Line } from "@/iso/react/draw";

/**
 * Static LoRa rings and optional hops. Rings are dotted; pass `dashed` on a link for Wi-Fi or Internet.
 * Nothing here animates, so reduced motion stays still.
 */
export function AirWaves({
  rings,
  links = [],
  className,
}: {
  rings: readonly string[];
  links?: readonly { d: string; dashed?: boolean }[];
  className?: string;
}): ReactElement {
  return (
    <g className={className} data-part="air">
      {rings.map((d, index) => (
        <Line key={`ring-${index}`} d={d} tone="lo" dotted />
      ))}
      {links.map((link, index) => (
        <Line key={`link-${index}`} d={link.d} tone="lo" dotted={!link.dashed} dashed={link.dashed ?? false} />
      ))}
    </g>
  );
}
