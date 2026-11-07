import type { ReactElement } from "react";
import { Line } from "@/iso/react/draw";
import { LoraRadio } from "../parts/lora-radio-art";
import { HALOS, HEIGHT, LINKS, RADIOS, RINGS, WIDTH } from "../welcome/geometry";
import "./mesh.css";

export function MeshFigure(): ReactElement {
  return (
    <figure className="iso-figure mesh-figure" aria-hidden>
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
        </svg>
      </div>
    </figure>
  );
}
