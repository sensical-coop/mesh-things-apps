import {
  boxCorners,
  corners,
  cylinder,
  dotGrid,
  knurl,
  planOutline,
  segment,
  sideMatrix,
  sideSeam,
  slabOf,
  type Point3,
  iso,
  type Projection,
  type SolidPaths,
} from "@/iso/iso-kit";
import { airPacket, airRings, wifiArcs } from "../parts/air-waves";
import { loraRadio } from "../parts/lora-radio";
import { FIGURE_HEIGHT, FIGURE_WIDTH, stepProjection } from "../view";

export const BASE = { x: -128, y: -44, w: 248, d: 70, r: 8 };
export const BASE_H = 8;
export const FOOT = 5;

const MAST: Point3 = [-88, 4, 0];
const FACE_X = 78;
const FACE_Y = -2;
const FACE_Z = 46;
export const DIAL_R = 20;

const bounds: Point3[] = [
  ...boxCorners(BASE, -FOOT, 78),
  [FACE_X + 8, FACE_Y, FACE_Z + DIAL_R + 10],
  [-70, 8, 72],
  [20, 10, 96],
];
export const P: Projection = stepProjection(bounds);
export const WIDTH = FIGURE_WIDTH;
export const HEIGHT = FIGURE_HEIGHT;

const feet = corners(BASE, 16).map(([x, y]) => ({ x: x - 8, y: y - 6, w: 16, d: 12, r: 2 }));
export const FOOT_PATHS = feet.map((plan) => slabOf(plan, -FOOT, FOOT, P));
export const BASE_PATHS = slabOf(BASE, 0, BASE_H, P);
export const GROOVE = planOutline({ x: BASE.x + 8, y: BASE.y + 8, w: BASE.w - 16, d: BASE.d - 16, r: 4 }, BASE_H, P);
export const PLATE = slabOf({ x: -120, y: -36, w: 42, d: 12, r: 1.5 }, BASE_H, 0.6, P);

const boltAt = [[-110, -30], [-110, 12], [108, -30], [108, 12]] as const;
export const BOLTS = boltAt.map(([x, y]) => cylinder(x, y, 2.2, BASE_H, 1.5, P, 8));

export const FLANGE = cylinder(MAST[0], MAST[1], 16, BASE_H, 3.2, P, 20);
const boltAngle = [0.4, 2, 3.6, 5.2];
export const FLANGE_BOLTS = boltAngle.map((angle) =>
  cylinder(MAST[0] + Math.cos(angle) * 11, MAST[1] + Math.sin(angle) * 11, 1.7, BASE_H + 3.2, 1.3, P, 8),
);
export const PEDESTAL = cylinder(MAST[0], MAST[1], 6.5, BASE_H + 3.2, 5, P, 16);
export const MAST_SHAFT = cylinder(MAST[0], MAST[1], 3.6, BASE_H + 8, 30, P, 16);
export const COLLAR = cylinder(MAST[0], MAST[1], 5.4, BASE_H + 24, 5, P, 16);
export const COLLAR_BOLT = cylinder(MAST[0] + 5.2, MAST[1] + 1, 1.3, BASE_H + 25.2, 2.4, P, 8);

const CASE = { x: MAST[0] - 18, y: MAST[1] - 9, w: 36, d: 18, r: 2 };
const CASE_Z = BASE_H + 32;
export const RADIO = slabOf(CASE, CASE_Z, 14, P);
export const RADIO_SEAM = sideSeam(CASE, CASE_Z + 10, P);
export const LID = slabOf({ x: CASE.x + 1.5, y: CASE.y + 1.5, w: CASE.w - 3, d: CASE.d - 3, r: 1.5 }, CASE_Z + 14, 2, P);
export const LID_SCREWS = corners(CASE, 5).map(([x, y]) => cylinder(x, y, 1.1, CASE_Z + 16, 0.8, P, 8));
export const GRILL = dotGrid(CASE.x + 4, CASE.y + 4, 4, 2, 2.4, CASE_Z + 7, P);

export const GLAND = cylinder(MAST[0] + 8, MAST[1], 2.4, CASE_Z - 3.2, 3.2, P, 12);
export const NUT = cylinder(MAST[0] + 6, CASE.y + CASE.d - 1, 2.6, CASE_Z + 16, 1.6, P, 6);
export const N_BODY = cylinder(MAST[0] + 6, CASE.y + CASE.d - 1, 1.8, CASE_Z + 17.6, 3.2, P, 10);
const WHIP_X = MAST[0] + 6;
const WHIP_Y = CASE.y + CASE.d - 1;
const COIL_Z = CASE_Z + 20.6;
export const COIL_FORM = cylinder(WHIP_X, WHIP_Y, 3.1, COIL_Z, 7, P, 12);
export const WHIP = segment([WHIP_X, WHIP_Y, COIL_Z + 5.5], [WHIP_X, WHIP_Y, COIL_Z + 40], P);
export const WHIP_TIP = cylinder(WHIP_X, WHIP_Y, 1.05, COIL_Z + 38, 3.4, P, 8);

const TERM = { x: MAST[0] - 6, y: MAST[1] + 10, w: 16, d: 8, r: 1 };
export const TERMINAL = slabOf(TERM, BASE_H, 3, P);
export const TERM_SCREWS = [2, 12].map((dx) => cylinder(TERM.x + dx, TERM.y + 5, 1.1, BASE_H + 3, 0.9, P, 8));
export const CABLE_FROM = iso([MAST[0] + 14, MAST[1] + 2, CASE_Z - 0.4], P);
export const CABLE_VIA = iso([MAST[0] + 32, MAST[1] - 6, BASE_H + 24], P);
export const CABLE_TO = iso([TERM.x + 12, TERM.y + 2, BASE_H + 3.6], P);
export const WATCH_NODES = [
  loraRadio({ x: -116, y: -32, z: BASE_H, scale: 0.42, facing: "y" }, P),
  loraRadio({ x: -72, y: 2, z: BASE_H, scale: 0.44, facing: "x" }, P),
  loraRadio({ x: -78, y: -38, z: BASE_H, scale: 0.42, facing: "x" }, P),
];
/** Skirted plinth, about 1.3× the gateway case, so the stand shows around the radio. */
const GATE_PLINTH_H = 12;
const GATE_SPEC = { x: 6, y: -6, z: BASE_H + GATE_PLINTH_H, scale: 0.56, facing: "x" as const };
export const WATCH_GATE = loraRadio(GATE_SPEC, P);
const gateFoot = WATCH_GATE.footprint;
export const GATE_PLINTH = slabOf(
  { x: gateFoot.x - 6, y: gateFoot.y - 6, w: gateFoot.w + 12, d: gateFoot.d + 12, r: 2 },
  BASE_H,
  GATE_PLINTH_H,
  P,
);
/** Pole on the near corner, in front of the skirt, same height as the plinth. */
export const GATE_SHAFT = cylinder(gateFoot.x + gateFoot.w + 2, gateFoot.y + gateFoot.d + 2, 2.4, BASE_H, GATE_PLINTH_H + 2, P, 12);
export const GATE_CAP = cylinder(gateFoot.x + gateFoot.w * 0.72, gateFoot.y + gateFoot.d * 0.72, 3.2, BASE_H + GATE_PLINTH_H - 1.6, 1.6, P, 10);
export const WIFI = wifiArcs(WATCH_GATE.usbAt, iso([62, FACE_Y, FACE_Z], P), [7, 12, 17]);
const near = WATCH_NODES[1] ?? WATCH_GATE;
export const WATCH_HOP = airPacket(near.antennaTip, WATCH_GATE.antennaTip, 16);
export const WATCH_LINKS = [0, 2].map((index) => {
  const node = WATCH_NODES[index] ?? near;
  return airPacket(node.antennaTip, near.antennaTip, 12).d;
});
export const WATCH_RINGS = [...WATCH_NODES, WATCH_GATE].flatMap((radio) => airRings(radio.antennaTip, [6, 11, 16]));
export const LAMP_AT = WATCH_GATE.ledAt;

export const NODE_SPECS = [
  { x: -46, y: 8, w: 16, d: 10, h: 8 },
  { x: -18, y: 2, w: 18, d: 11, h: 9 },
  { x: -52, y: -40, w: 15, d: 10, h: 7 },
] as const;

export const NODE_FEET = NODE_SPECS.map((node) => slabOf({ x: node.x - 2, y: node.y - 2, w: node.w + 4, d: node.d + 6, r: 1 }, BASE_H, 2, P));
export const NODE_POSTS = NODE_SPECS.map((node) => cylinder(node.x + node.w / 2, node.y + node.d + 1, 1.6, BASE_H + 2, 4, P, 8));
export const NODE_BODIES = NODE_SPECS.map((node) => slabOf({ x: node.x, y: node.y, w: node.w, d: node.d, r: 1.4 }, BASE_H + 6, node.h, P));
export const NODE_LIDS = NODE_SPECS.map((node) =>
  slabOf({ x: node.x + 1, y: node.y + 1, w: node.w - 2, d: node.d - 2, r: 1 }, BASE_H + 6 + node.h, 1.2, P),
);
export const NODE_STUBS = NODE_SPECS.map((node) => cylinder(node.x + node.w - 3, node.y + 2, 1.1, BASE_H + 7 + node.h, 5, P, 8));
export const NODE_WHIPS = NODE_SPECS.map((node) =>
  segment(
    [node.x + node.w - 3, node.y + 2, BASE_H + 11 + node.h],
    [node.x + node.w - 3, node.y + 2, BASE_H + 16 + node.h],
    P,
  ),
);

const BOX = { x: 62, y: -22, w: 16, d: 44, r: 2 };
export const PLINTH = slabOf({ x: 58, y: -26, w: 24, d: 50, r: 2 }, BASE_H, 3, P);
export const HOUSING = slabOf(BOX, BASE_H + 3, 58, P);
export const HOUSING_SEAM = sideSeam(BOX, BASE_H + 34, P);
export const HOUSING_SCREWS = [
  cylinder(BOX.x + 8, BOX.y + 6, 1, BASE_H + 8, 1, P, 8),
  cylinder(BOX.x + 8, BOX.y + BOX.d - 6, 1, BASE_H + 8, 1, P, 8),
];
export const CROWN = cylinder(BOX.x + 8, FACE_Y, 4.2, BASE_H + 61, 7, P, 14);
export const CROWN_KNURL = knurl(BOX.x + 8, FACE_Y, 4.35, BASE_H + 62, BASE_H + 67, 12, P, 0);
export const CROWN_CAP = cylinder(BOX.x + 8, FACE_Y, 2.4, BASE_H + 68, 1.2, P, 10);

export const FACE = sideMatrix([FACE_X, FACE_Y], FACE_Z, P, "right");
export const PIVOT = sideMatrix([BOX.x + BOX.w, BOX.y + BOX.d], BASE_H + 40, P, "left");
export const PIN = cylinder(BOX.x + BOX.w - 1, BOX.y + BOX.d - 1, 1.5, BASE_H + 38, 4, P, 8);

const SWEEP = (Math.PI * 4) / 3;
const START = -Math.PI / 2;

function polar(radius: number, angle: number): [number, number] {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

function tickPath(count: number, every: number, outer: number, innerMinor: number, innerMajor: number) {
  const minor: string[] = [];
  const major: string[] = [];
  for (let index = 0; index <= count; index++) {
    const angle = START + (index / count) * SWEEP;
    const big = index % every === 0;
    const [x0, y0] = polar(big ? innerMajor : innerMinor, angle);
    const [x1, y1] = polar(outer, angle);
    (big ? major : minor).push(`M${x0.toFixed(2)} ${y0.toFixed(2)}L${x1.toFixed(2)} ${y1.toFixed(2)}`);
  }
  return { minor: minor.join(""), major: major.join("") };
}

export const TICKS = tickPath(12, 4, 18.2, 15.4, 13.2);
export const TRIP_TICK = (() => {
  const [x0, y0] = polar(12, START + SWEEP);
  const [x1, y1] = polar(18.6, START + SWEEP);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}L${x1.toFixed(2)} ${y1.toFixed(2)}`;
})();

export function needleLocal(fraction: number): string {
  const angle = START + Math.min(Math.max(fraction, 0), 1) * SWEEP;
  const [x0, y0] = polar(2.4, angle);
  const [x1, y1] = polar(13.5, angle);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}L${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export const PACKET_FROM = WATCH_HOP.at(0);
export const PACKET_TO = WATCH_HOP.at(1);

export type Solid = SolidPaths;
