import { iso, lineOnTop, pathOf, translateAlong, type Flat, type Point3, type Plane, type SolidPaths } from "@/iso/iso-kit";
import {
  BOX,
  BOX_Z,
  DIAL,
  FLAG_PIVOT,
  P,
  SWEEP,
  SWEEP_FROM,
  WALL_H,
} from "./geometry";
import { COOLDOWN_SECONDS, type Scene } from "./model";

function hull(points: Flat[]): Flat[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Flat, a: Flat, b: Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (source: Flat[]) => {
    const ring: Flat[] = [];
    for (const point of source) {
      while (ring.length >= 2) {
        const o = ring[ring.length - 2];
        const a = ring[ring.length - 1];
        if (!o || !a || cross(o, a, point) > 0) break;
        ring.pop();
      }
      ring.push(point);
    }
    return ring;
  };
  const lower = build(sorted);
  const upper = build([...sorted].reverse());
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

export function doorPaths(open: number): SolidPaths {
  const yH = BOX.y + BOX.d + 0.4;
  const zH = BOX_Z + 1.5;
  const x0 = BOX.x + 5;
  const x1 = BOX.x + BOX.w - 5;
  const height = WALL_H - 3;
  const thick = 1.6;
  const angle = -open * 1.15;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const rot = (x: number, y: number, z: number): Point3 => {
    const dy = y - yH;
    const dz = z - zH;
    return [x, yH + dy * c - dz * s, zH + dy * s + dz * c];
  };
  const plate: Point3[] = [
    rot(x0, yH, zH),
    rot(x1, yH, zH),
    rot(x1, yH + thick, zH + height),
    rot(x0, yH + thick, zH + height),
  ];
  const mid = (x0 + x1) / 2;
  const latch: Point3[] = [
    rot(mid - 4, yH, zH + height - 1),
    rot(mid + 4, yH, zH + height - 1),
    rot(mid + 3.2, yH + thick + 2.4, zH + height + 3.2),
    rot(mid - 3.2, yH + thick + 2.4, zH + height + 3.2),
  ];
  const flat = [...plate, ...latch].map((point) => iso(point, P));
  const face = plate.map((point) => iso(point, P));
  const shell = pathOf(hull(flat), true);
  const doorFace = pathOf(face, true);
  return {
    fill: shell,
    top: doorFace,
    outline: shell,
    crease: doorFace,
    shades: [doorFace, pathOf(latch.map((point) => iso(point, P)), true), "", ""],
    bevel: "",
  };
}

function flagQuad(raised: number, x: number): Flat[] {
  const angle = raised * Math.PI;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const local: Point3[] = [
    [x, -1.4, -1.2],
    [x, 6.2, -1.2],
    [x, 6.2, -18],
    [x, -1.4, -18],
  ];
  return local.map(([lx, ly, lz]) => iso([FLAG_PIVOT[0] + lx, FLAG_PIVOT[1] + ly * c - lz * s, FLAG_PIVOT[2] + ly * s + lz * c], P));
}

function link(front: Flat[], back: Flat[]) {
  const parts: string[] = [];
  for (let index = 0; index < front.length; index++) {
    const a = front[index];
    const b = back[index];
    if (a && b) parts.push(pathOf([a, b]));
  }
  return parts.join("");
}

export function flagPaths(raised: number): SolidPaths {
  const front = flagQuad(raised, 0.7);
  const back = flagQuad(raised, -0.5);
  return {
    fill: pathOf(front, true),
    top: pathOf(front, true),
    outline: pathOf(front, true) + pathOf(back, true) + link(front, back),
    crease: "",
    shades: [pathOf(front, true), "", "", ""],
    bevel: undefined,
  };
}

export function needlePath(seconds: number) {
  const along = 1 - seconds / COOLDOWN_SECONDS;
  const angle = SWEEP_FROM + along * SWEEP;
  const len = DIAL.r - 4.4;
  const tip: Plane = [DIAL.x + Math.cos(angle) * len, DIAL.y + Math.sin(angle) * len];
  const z = DIAL.z + DIAL.h + 0.45;
  return { d: lineOnTop([DIAL.x, DIAL.y], tip, z, P), tip: iso([tip[0], tip[1], z], P) };
}

export function envelopeShift(scene: Scene): Point3 {
  const falling = (1 - scene.drop) * 36;
  const emerge = scene.door > 0.05 ? scene.door : 0;
  return [emerge * 4, emerge * 10 + scene.taken * 16, falling - emerge * 8];
}

export function envelopeOpacity(scene: Scene) {
  const falling = scene.drop > 0.03 && scene.drop < 0.97 && scene.flag < 0.4;
  const open = scene.door > 0.08 || scene.taken > 0.03;
  return falling || open ? 1 : 0;
}

export const doorRest = doorPaths(0);
export const flagRest = flagPaths(0);
export const needleRest = needlePath(COOLDOWN_SECONDS);

export function writeSolid(node: SVGGElement | null, paths: SolidPaths) {
  if (!node) return;
  const set = (selector: string, d: string) => node.querySelector(selector)?.setAttribute("d", d);
  set(":scope > .iso-fill", paths.fill);
  set(":scope > .iso-top", paths.top);
  set(":scope > .iso-edge", paths.outline);
  set(":scope > .iso-crease", paths.crease);
  const shades = node.querySelectorAll(":scope > .iso-shade");
  shades.forEach((shade, index) => shade.setAttribute("d", paths.shades[index] ?? ""));
}

export const envelopeTransform = (scene: Scene) => translateAlong(P, envelopeShift(scene));
