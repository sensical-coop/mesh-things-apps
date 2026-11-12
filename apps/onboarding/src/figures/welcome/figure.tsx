import { type ReactElement, useRef } from "react";
import { useInView, useLoop, useStillness } from "@/iso/react/live";
import { MeshScene } from "../parts/mesh-scene-art";
import { ROUTE_START } from "../parts/mesh-scene";
import { packetTransform } from "./geometry";
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
      <MeshScene>
        <g ref={dot} className="iso-dots" data-tone="mid">
          <circle cx={ROUTE_START[0]} cy={ROUTE_START[1]} r={2.4} />
        </g>
      </MeshScene>
    </figure>
  );
}
