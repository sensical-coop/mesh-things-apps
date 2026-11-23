import type { ReactElement, ReactNode } from "react";
import { FaceText, Line, Solid } from "@/iso/react/draw";
import type { LoraRadioParts } from "./lora-radio";

/**
 * Draws {@link LoraRadioParts}. `screen` is laid on the OLED in the part's `topMatrix`
 * (a short name, then the node id, as `<tspan>` lines). `lit` marks the whole node.
 */
export function LoraRadio({
  parts,
  screen,
  lit = false,
  className,
}: {
  parts: LoraRadioParts;
  screen?: ReactNode;
  lit?: boolean;
  className?: string;
}): ReactElement {
  return (
    <g className={className} data-part="lora-radio">
      <Solid paths={parts.body} tone="mid" crease="faint" lit={lit} />
      <Line d={parts.seam} tone="faint" />
      <Solid paths={parts.window} tone="lo" crease="none" flat lit={lit} />
      <Line d={parts.windowRim} tone="lo" />
      <Solid paths={parts.button} tone="hi" crease="none" lit={lit} />
      <Solid paths={parts.led} tone="hi" crease="none" lit={lit} />
      <Solid paths={parts.usb} tone="lo" crease="none" lit={lit} />
      <Line d={parts.usbMouth} tone="mid" />
      <Solid paths={parts.boss} tone="mid" crease="none" lit={lit} />
      <Solid paths={parts.sma} tone="mid" crease="none" lit={lit} />
      <Solid paths={parts.sleeve} tone="lo" crease="none" lit={lit} />
      <Solid paths={parts.whip} tone="mid" crease="none" lit={lit} />
      {screen ? (
        <FaceText transform={parts.screen} size={parts.glyph} tone="hi">
          {screen}
        </FaceText>
      ) : null}
    </g>
  );
}
