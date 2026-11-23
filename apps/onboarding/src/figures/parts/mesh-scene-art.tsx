import type { ReactElement, ReactNode } from "react";
import { Line } from "@/iso/react/draw";
import { LoraRadio } from "./lora-radio-art";
import { HALOS, HEIGHT, LINKS, RADIOS, RINGS, WIDTH } from "./mesh-scene";

/** The lit mesh on its plate: three radios, their air rings and the links between them. `children` draw on top. */
export function MeshScene({ children }: { children?: ReactNode }): ReactElement {
  return (
    <div className="iso-plate">
      <svg className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} focusable="false">
        {HALOS.map((d, index) => (
          <path key={index} className="iso-halo" d={d} />
        ))}
        {RADIOS.map((radio, index) => (
          <LoraRadio key={index} parts={radio} lit />
        ))}
        {[...RINGS.flat(), ...LINKS].map((d, index) => (
          <Line key={index} d={d} tone="lit" dotted />
        ))}
        {children}
      </svg>
    </div>
  );
}
