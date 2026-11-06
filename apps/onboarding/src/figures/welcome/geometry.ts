import { AZIMUTH, ELEVATION, iso, slabOf, type Flat, type Point3, type Projection } from "@/iso/iso-kit";
import { GATE_SPEC, NODE_SPECS } from "../basics/model";
import { airPacket, airRings } from "../parts/air-waves";
import { LORA_CASE, antennaPoint, loraRadio, loraRadioBounds, type LoraRadioSpec } from "../parts/lora-radio";

/** The basics bench's three radios, same places and scales, set down on the plate without the bench or the gateway's plinth. */
const SPECS: LoraRadioSpec[] = [...NODE_SPECS, GATE_SPEC].map((spec) => ({ ...spec, z: 0 }));

const BOUNDS: Point3[] = SPECS.flatMap((spec) => {
  const tip = antennaPoint(spec);
  return [...loraRadioBounds(spec), [tip[0], tip[1], tip[2] + 16] as Point3];
});

/** Room past the bounds for the halos and the air rings. */
const MARGIN = 16;
const flat = BOUNDS.map((point) => iso(point, { origin: [0, 0], scale: 1, azimuth: AZIMUTH, elevation: ELEVATION }));
const left = Math.min(...flat.map(([x]) => x));
const top = Math.min(...flat.map(([, y]) => y));

const P: Projection = { origin: [MARGIN - left, MARGIN - top], scale: 1, azimuth: AZIMUTH, elevation: ELEVATION };
export const WIDTH = Math.ceil(Math.max(...flat.map(([x]) => x)) - left + MARGIN * 2);
export const HEIGHT = Math.ceil(Math.max(...flat.map(([, y]) => y)) - top + MARGIN * 2);

export const RADIOS = SPECS.map((spec) => loraRadio(spec, P));

/** A soft shadow under each case, so the nodes sit on the plate without a bench. */
export const HALOS = SPECS.map(({ x, y, scale = 1 }) =>
  slabOf({ x: x - 4, y: y - 4, w: LORA_CASE.length * scale + 8, d: LORA_CASE.width * scale + 8, r: 4 }, 0, 1, P).fill,
);

const [rear, front, gate] = RADIOS.map((radio) => radio.antennaTip);
if (!rear || !front || !gate) throw new Error("radios");

/** Gentle arcs, as on the basics bench: the two nodes, and each node to the gateway. */
const LIFT = 8;
const BASE = airPacket(rear, front, LIFT);
const SIDE = airPacket(front, gate, LIFT);
export const LINKS = [BASE.d, SIDE.d, airPacket(rear, gate, LIFT).d];

/** Air rings per radio, in `RADIOS` order; the gateway's are a size up. */
export const RINGS = [airRings(rear, [5, 9, 13]), airRings(front, [5, 9, 13]), airRings(gate, [6, 11, 16])];

/** The reading rides the drawn arcs: rear node to the front one, then up to the gateway. */
const ROUTE = [BASE, SIDE];
export const ROUTE_START: Flat = rear;

export function packetTransform(progress: number): string {
  const scaled = Math.min(0.9999, Math.max(0, progress)) * ROUTE.length;
  const leg = ROUTE[Math.floor(scaled)];
  if (!leg) throw new Error("route");
  const at = leg.at(scaled - Math.floor(scaled));
  return `translate(${(at[0] - ROUTE_START[0]).toFixed(2)} ${(at[1] - ROUTE_START[1]).toFixed(2)})`;
}
