import type { ReactNode } from "react";
import { Dots, Line, Solid } from "@/iso/react/draw";
import { AirWaves } from "../parts/air-waves-art";
import { LoraRadio } from "../parts/lora-radio-art";
import {
  BASE_PATHS,
  BOLTS,
  CROWN,
  CROWN_CAP,
  CROWN_KNURL,
  FOOT_PATHS,
  GROOVE,
  HOUSING,
  HOUSING_SCREWS,
  HOUSING_SEAM,
  GATE_CAP,
  GATE_PLINTH,
  GATE_SHAFT,
  WIFI,
  WATCH_GATE,
  WATCH_HOP,
  WATCH_LINKS,
  WATCH_NODES,
  WATCH_RINGS,
  PIN,
  PLATE,
  PLINTH,
} from "./geometry";

export const BENCH: ReactNode = (
  <g>
    {FOOT_PATHS.map((paths, index) => (
      <Solid key={index} paths={paths} tone="lo" />
    ))}
    <Solid paths={BASE_PATHS} tone="mid" halo />
    <Line d={GROOVE} tone="lo" />
    <Solid paths={PLATE} tone="lo" />
    {BOLTS.map((paths, index) => (
      <Solid key={index} paths={paths} tone="hi" />
    ))}
    {WATCH_NODES.map((radio, index) => (
      <LoraRadio key={index} parts={radio} />
    ))}
    <Solid paths={GATE_PLINTH} tone="lo" />
    <Solid paths={GATE_SHAFT} tone="mid" />
    <Solid paths={GATE_CAP} tone="hi" />
    <LoraRadio parts={WATCH_GATE} screen="GW" />
    <AirWaves rings={WATCH_RINGS} links={[...WATCH_LINKS.map((d) => ({ d })), { d: WATCH_HOP.d }]} />
    <Solid paths={PLINTH} tone="lo" />
    <Solid paths={HOUSING} tone="mid" />
    <Line d={HOUSING_SEAM} tone="faint" />
    {HOUSING_SCREWS.map((paths, index) => (
      <Solid key={index} paths={paths} tone="lo" />
    ))}
    <Solid paths={PIN} tone="hi" />
    <Solid paths={CROWN} tone="hi" />
    <Line d={CROWN_KNURL} tone="lo" />
    <Solid paths={CROWN_CAP} tone="mid" />
    <AirWaves rings={[]} links={WIFI.map((d) => ({ d, dashed: true }))} />
  </g>
);
