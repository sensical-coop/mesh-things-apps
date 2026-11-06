import { AZIMUTH, ELEVATION, iso, type Point3, type Projection } from "@/iso/iso-kit";

/** Every step figure draws into the same viewBox. */
export const FIGURE_WIDTH = 480;
export const FIGURE_HEIGHT = 240;

/** One world unit is one viewBox unit in every figure, so the set keeps one scale. */
const SCALE = 1;

/** The shared camera, centred on the figure's bounding points. The scale never changes between figures. */
export function stepProjection(points: Point3[], azimuth = AZIMUTH, elevation = ELEVATION): Projection {
  const flat = points.map((point) => iso(point, { origin: [0, 0], scale: SCALE, azimuth, elevation }));
  const xs = flat.map(([x]) => x);
  const ys = flat.map(([, y]) => y);
  const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
  return { origin: [FIGURE_WIDTH / 2 - midX, FIGURE_HEIGHT / 2 - midY], scale: SCALE, azimuth, elevation };
}
