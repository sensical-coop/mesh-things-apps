import { type ReactElement, type ReactNode, useLayoutEffect, useRef } from "react";
import { IsoFigure } from "@/iso/react/draw";
import { useInView, useLoop, useStillness } from "@/iso/react/live";
import { HEIGHT, ROUTE_START, WIDTH, packetTransform } from "./geometry";
import { type BasicsConcept, ROUTE_SECONDS } from "./model";

type Props = {
  selected: BasicsConcept;
  label: string;
  base: ReactNode;
  radios: ReactNode;
  mesh: ReactNode;
  gate: ReactNode;
  uplink: ReactNode;
  sort: ReactNode;
  store: ReactNode;
};

function paint(node: SVGGElement | null, on: boolean): void {
  node?.querySelectorAll(".iso-solid").forEach((solid) => {
    if (on) solid.setAttribute("data-lit", "");
    else solid.removeAttribute("data-lit");
  });
}

function toneLines(node: SVGGElement | null, lit: boolean): void {
  node?.querySelectorAll(".iso-line").forEach((line) => {
    line.setAttribute("data-tone", lit ? "lit" : "lo");
  });
}

/** Not interactive: the step's concept cards pick what is lit; the reading loops from the rear node to the database. */
export function BasicsLive({ selected, label, base, radios, mesh, gate, uplink, sort, store }: Props): ReactElement {
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage);
  const still = useStillness();
  const radiosRef = useRef<SVGGElement>(null);
  const gateRef = useRef<SVGGElement>(null);
  const storeRef = useRef<SVGGElement>(null);
  const meshRef = useRef<SVGGElement>(null);
  const uplinkRef = useRef<SVGGElement>(null);
  const dotRef = useRef<SVGGElement>(null);
  const clock = useRef(0);

  useLayoutEffect(() => {
    const all = selected === "mesh";
    paint(radiosRef.current, selected === "node" || all);
    paint(gateRef.current, selected === "gateway" || all);
    paint(storeRef.current, selected === "reading");
    toneLines(meshRef.current, selected === "node" || all);
    toneLines(uplinkRef.current, selected === "gateway");
    toneLines(storeRef.current, selected === "reading");
  }, [selected]);

  useLoop((dt) => {
    clock.current = (clock.current + dt) % ROUTE_SECONDS;
    dotRef.current?.setAttribute("transform", packetTransform(clock.current / ROUTE_SECONDS));
    return true;
  }, inView && !still);

  return (
    <div ref={stage}>
      <IsoFigure width={WIDTH} height={HEIGHT} label={label} className="basics">
        {base}
        <g ref={radiosRef}>{radios}</g>
        <g ref={gateRef}>{gate}</g>
        <g ref={meshRef}>{mesh}</g>
        <g>{sort}</g>
        <g ref={uplinkRef}>{uplink}</g>
        <g ref={storeRef}>{store}</g>
        <g ref={dotRef} className="iso-dots" data-tone="mid">
          <circle cx={ROUTE_START[0]} cy={ROUTE_START[1]} r={2.4} />
        </g>
      </IsoFigure>
    </div>
  );
}
