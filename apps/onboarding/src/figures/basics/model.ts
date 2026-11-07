import type { LoraRadioSpec } from "../parts/lora-radio";

export type BasicsConcept = "mesh" | "gateway" | "node" | "reading";

/** Seconds for the reading to travel from the rear node to the database: six legs, 1.5 s each. */
export const ROUTE_SECONDS = 9;

export const BENCH = { x: 0, y: 6, w: 244, d: 92, h: 8 } as const;

const TOP = BENCH.h;

/** Rear node first so it paints behind. */
export const NODE_SPECS: readonly LoraRadioSpec[] = [
  { x: 14, y: 14, z: TOP, scale: 0.4, facing: "x" },
  { x: 14, y: 70, z: TOP, scale: 0.4, facing: "x" },
];

export const GATE_SPEC: LoraRadioSpec = { x: 70, y: 42, z: TOP + 3, scale: 0.48, facing: "x" };
export const BROKER = { x: 124, y: 40, w: 36, d: 28, h: 20 } as const;
export const DB = { cx: 204, cy: 60, r: 13, disc: 7, gap: 1.2 } as const;
