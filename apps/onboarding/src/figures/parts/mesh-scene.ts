import { slabOf, type Flat, type Point3 } from "@/iso/iso-kit";
import { airPacket, airRings, pointOnRoute } from "./air-waves";
import { LORA_CASE, antennaPoint, loraRadio, loraRadioBounds, type LoraRadioSpec } from "./lora-radio";
import { hugProjection } from "../view";

/** Where the three radios stand on the basics bench, rear node first so it paints behind. The bench sets their height. */
export const NODE_PLACES = [
  { x: 14, y: 14, scale: 0.4, facing: "x" },
  { x: 14, y: 70, scale: 0.4, facing: "x" },
] as const;
export const GATE_PLACE = { x: 70, y: 42, scale: 0.48, facing: "x" } as const;

/** The same three radios, set down on the plate without the bench or the gateway's plinth. */
const SPECS: LoraRadioSpec[] = [...NODE_PLACES, GATE_PLACE].map((place) => ({ ...place, z: 0 }));

const BOUNDS: Point3[] = SPECS.flatMap((spec) => {
  const tip = antennaPoint(spec);
  return [...loraRadioBounds(spec), [tip[0], tip[1], tip[2] + 16] as Point3];
});

const hugged = hugProjection(BOUNDS, 16);
const P = hugged.projection;
export const WIDTH = hugged.width;
export const HEIGHT = hugged.height;

export const RADIOS = SPECS.map((spec) => loraRadio(spec, P));

/** A soft shadow under each case, so the nodes sit on the plate without a bench. */
export const HALOS = SPECS.map(({ x, y, scale = 1 }) =>
  slabOf({ x: x - 4, y: y - 4, w: LORA_CASE.length * scale + 8, d: LORA_CASE.width * scale + 8, r: 4 }, 0, 1, P).fill,
);

const [rear, front, gate] = RADIOS.map((radio) => radio.antennaTip);
if (!rear || !front || !gate) throw new Error("radios");

const LIFT = 8;
const BASE = airPacket(rear, front, LIFT);
const SIDE = airPacket(front, gate, LIFT);
export const LINKS = [BASE.d, SIDE.d, airPacket(rear, gate, LIFT).d];

export const RINGS = [airRings(rear, [5, 9, 13]), airRings(front, [5, 9, 13]), airRings(gate, [6, 11, 16])];

export const ROUTE = [BASE, SIDE];
export const ROUTE_START: Flat = rear;
