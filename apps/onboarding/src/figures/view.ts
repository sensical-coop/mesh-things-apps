import { AZIMUTH, ELEVATION, iso, type Point3, type Projection } from "@/iso/iso-kit";
import { START_STEPS, type StartStep } from "@/start-step";

/** 480×240 for `stepProjection`. Basics and welcome use `hugProjection` and their own viewBox. */
export const FIGURE_WIDTH = 480;
export const FIGURE_HEIGHT = 240;

/** Clamped smoothstep: 0 below 0, 1 above 1. */
export function smoothstep(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

/** Smoothstep of `unit` between `from` and `to`. */
export const span = (unit: number, from: number, to: number) => smoothstep((unit - from) / (to - from));

/** Plate number of a step's figure: its place in the flow. */
export function figLabel(step: StartStep): string {
  return `Fig ${START_STEPS.indexOf(step) + 1}`;
}

/** This camera stays at scale 1. Connect fits 480×240 with its own scale (`fitBounds`). */
const SCALE = 1;

const camera = { azimuth: AZIMUTH, elevation: ELEVATION };

function placed(points: Point3[]) {
  const flat = points.map((point) => iso(point, { origin: [0, 0], scale: SCALE, ...camera }));
  const xs = flat.map(([x]) => x);
  const ys = flat.map(([, y]) => y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

export function stepProjection(points: Point3[]): Projection {
  const { minX, maxX, minY, maxY } = placed(points);
  return { origin: [FIGURE_WIDTH / 2 - (minX + maxX) / 2, FIGURE_HEIGHT / 2 - (minY + maxY) / 2], scale: SCALE, ...camera };
}

export function hugProjection(points: Point3[], margin: number): { projection: Projection; width: number; height: number } {
  const { minX, maxX, minY, maxY } = placed(points);
  return {
    projection: { origin: [margin - minX, margin - minY], scale: SCALE, ...camera },
    width: Math.ceil(maxX - minX + margin * 2),
    height: Math.ceil(maxY - minY + margin * 2),
  };
}
