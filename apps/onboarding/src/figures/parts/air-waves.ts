import { pathOf, type Flat } from "../../iso/iso-kit.ts";

export type AirPacket = {
  d: string;
  at: (t: number) => Flat;
};

function arc(tip: Flat, radius: number, from: number, to: number): string {
  const steps = 14;
  const points: Flat[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const angle = from + ((to - from) * index) / steps;
    points.push([tip[0] + Math.cos(angle) * radius, tip[1] + Math.sin(angle) * radius]);
  }
  return pathOf(points);
}

/**
 * Open arcs around `tip`. `bearing` is a viewBox angle (0 = +x, clockwise because y grows down).
 * Paths are static; do not animate them when the user prefers reduced motion.
 */
export function signalArcs(tip: Flat, bearing: number, radii: readonly number[], spread = 1.05): string[] {
  return radii.map((radius) => arc(tip, radius, bearing - spread, bearing + spread));
}

export function airRings(tip: Flat, radii: readonly number[] = [8, 14, 20]): string[] {
  return signalArcs(tip, -Math.PI / 2, radii, 1.15);
}

export function wifiArcs(from: Flat, toward: Flat, radii: readonly number[] = [7, 12, 17]): string[] {
  const bearing = Math.atan2(toward[1] - from[1], toward[0] - from[0]);
  return signalArcs(from, bearing, radii, 0.62);
}

/** The curve bows toward the top of the viewBox (smaller y), so it does not read as a cable. `lift` is in viewBox units. */
export function airPacket(from: Flat, to: Flat, lift = 24): AirPacket {
  const control: Flat = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 - lift];
  const at = (t: number): Flat => {
    const u = Math.min(1, Math.max(0, t));
    const a = (1 - u) * (1 - u);
    const b = 2 * (1 - u) * u;
    const c = u * u;
    return [a * from[0] + b * control[0] + c * to[0], a * from[1] + b * control[1] + c * to[1]];
  };
  const points: Flat[] = [];
  for (let index = 0; index <= 16; index += 1) points.push(at(index / 16));
  return { d: pathOf(points), at };
}

/** Position along a sequence of hops. `progress` 0 is the first hop's start; 1 stays on the last hop. */
export function pointOnRoute(legs: readonly AirPacket[], progress: number): Flat {
  const scaled = Math.min(0.9999, Math.max(0, progress)) * legs.length;
  const index = Math.floor(scaled);
  const leg = legs[index];
  if (!leg) throw new Error("route");
  return leg.at(scaled - index);
}
