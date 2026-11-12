import type { LoraRadioSpec } from "../parts/lora-radio";
import { GATE_PLACE, NODE_PLACES } from "../parts/mesh-scene";

export type BasicsConcept = "mesh" | "gateway" | "node" | "reading";

/** Seconds for the reading to travel from the rear node to the database: six legs, 1.5 s each. */
export const ROUTE_SECONDS = 9;

export const BENCH = { x: 0, y: 6, w: 244, d: 92, h: 8 } as const;

const TOP = BENCH.h;

export const NODE_SPECS: readonly LoraRadioSpec[] = NODE_PLACES.map((place) => ({ ...place, z: TOP }));

export const GATE_SPEC: LoraRadioSpec = { ...GATE_PLACE, z: TOP + 3 };
export const BROKER = { x: 124, y: 40, w: 36, d: 28, h: 20 } as const;
export const DB = { cx: 204, cy: 60, r: 13, disc: 7, gap: 1.2 } as const;
