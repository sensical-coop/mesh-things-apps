import { type ReactElement, useRef } from "react";
import { Line } from "@/iso/react/draw";
import { useInView, useLoop, useStillness } from "@/iso/react/live";
import { LoraRadio } from "../parts/lora-radio-art";
import { HALOS, HEIGHT, LINKS, RADIOS, RINGS, ROUTE_START, WIDTH, packetTransform } from "./geometry";
import "./welcome.css";

/** Seconds per loop: two hops, at the basics bench's pace (1.5 s a hop). */
const LOOP = 3;

export function WelcomeFigure(): ReactElement {
  const stage = useRef<HTMLElement>(null);
  const dot = useRef<SVGGElement>(null);
  const clock = useRef(0);
  const inView = useInView(stage);
  const still = useStillness();

  useLoop((dt) => {
    clock.current = (clock.current + dt) % LOOP;
    dot.current?.setAttribute("transform", packetTransform(clock.current / LOOP));
    return true;
  }, inView && !still);

  return (
    <figure ref={stage} className="iso-figure welcome-figure" aria-hidden>
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
          <g ref={dot} className="iso-dots" data-tone="mid">
            <circle cx={ROUTE_START[0]} cy={ROUTE_START[1]} r={2.4} />
          </g>
        </svg>
      </div>
    </figure>
  );
}
