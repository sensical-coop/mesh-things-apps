import {
  boxCorners,
  cameraOf,
  corners,
  cylinder,
  depthOf,
  iso,
  knurl,
  lineOnTop,
  pathOf,
  ring,
  planOutline,
  sideArc,
  sideMatrix,
  sideSeam,
  slabOf,
  topTicks,
  towardViewer,
  translateAlong,
  type Plan,
  type Point3,
  type Projection,
  type SolidPaths,
} from "@/iso/iso-kit";
import { FIGURE_HEIGHT, FIGURE_WIDTH, stepProjection } from "../view";
import { airPacket, airRings } from "../parts/air-waves";
import { loraRadio, loraRadioBounds, type LoraRadioSpec } from "../parts/lora-radio";
import { RANGE_MAX, RANGE_MIN, REST_READING, SCALE_HI, SCALE_LO } from "./model";

export const PLATE: Plan = { x: -130, y: -72, w: 260, d: 148, r: 7 };
const PLATE_H = 7;
const FOOT = 5;

export const GAUGE_X = -58;
export const GAUGE_Z = 52;
export const FACE_Y = 20.4;
const CASE: Plan = { x: -92, y: 4, w: 68, d: 16, r: 3 };
const CASE_Z = 24;
const CASE_H = 56;

export const BELL: [number, number] = [8, -46];
const BELL_POST = 34;

const RULE: Plan = { x: 42, y: -6, w: 78, d: 36, r: 2 };
const RULE_Z = 18;

/** About 1.5× the first node, on the near-right so the whip stays below the dial. */
const NODE_SPEC: LoraRadioSpec = { x: -78, y: 54, z: PLATE_H, scale: 0.63, facing: "x" };
const SENSOR_BOARD: Plan = { x: -96, y: 56, w: 14, d: 14, r: 1.2 };

const bounds: Point3[] = [
  ...boxCorners(PLATE, -FOOT, 0),
  ...boxCorners(CASE, CASE_Z, CASE_Z + CASE_H),
  [GAUGE_X, FACE_Y, GAUGE_Z + 28],
  [BELL[0], BELL[1], BELL_POST + 36],
  [RULE.x + RULE.w, RULE.y + RULE.d, RULE_Z + 16],
  ...loraRadioBounds(NODE_SPEC),
  ...boxCorners(SENSOR_BOARD, PLATE_H, PLATE_H + 6),
];

export const P: Projection = stepProjection(bounds);
export const WIDTH = FIGURE_WIDTH;
export const HEIGHT = FIGURE_HEIGHT;

export const FACE = sideMatrix([GAUGE_X, FACE_Y], GAUGE_Z, P, "left");

/** Angle 0 is straight up on the dial; positive is clockwise. Scale runs −120° to +120°. */
export const ARC_START = (-120 * Math.PI) / 180;
export const ARC_END = (120 * Math.PI) / 180;

export function dialAngle(reading: number) {
  const share = (reading - SCALE_LO) / (SCALE_HI - SCALE_LO);
  return ARC_START + share * (ARC_END - ARC_START);
}

export function polar(angle: number, radius: number): [number, number] {
  return [Math.sin(angle) * radius, -Math.cos(angle) * radius];
}

const tenth = (value: number) => (Math.round(value * 100) / 100).toString();

export function spoke(angle: number, inner: number, outer: number) {
  const [x0, y0] = polar(angle, inner);
  const [x1, y1] = polar(angle, outer);
  return `M${tenth(x0)} ${tenth(y0)}L${tenth(x1)} ${tenth(y1)}`;
}

export function ringPath(radius: number, steps = 48) {
  let d = "";
  for (let index = 0; index <= steps; index++) {
    const [x, y] = polar((index / steps) * Math.PI * 2, radius);
    d += `${index ? "L" : "M"}${tenth(x)} ${tenth(y)}`;
  }
  return `${d}Z`;
}

export function bandPath(maxReading: number) {
  const from = dialAngle(maxReading);
  const to = ARC_END;
  const radius = 15.2;
  const [x0, y0] = polar(from, radius);
  const [x1, y1] = polar(to, radius);
  const large = to - from > Math.PI ? 1 : 0;
  return `M${tenth(x0)} ${tenth(y0)}A${radius} ${radius} 0 ${large} 1 ${tenth(x1)} ${tenth(y1)}`;
}

export function needlePath(reading: number) {
  return spoke(dialAngle(reading), 3.6, 13.4);
}

export function tabTip(reading: number, radius: number): [number, number] {
  return polar(dialAngle(reading), radius);
}

function ticks(every: number) {
  const minor: string[] = [];
  const major: string[] = [];
  const count = 24;
  for (let index = 0; index <= count; index++) {
    const angle = ARC_START + (index / count) * (ARC_END - ARC_START);
    const big = index % every === 0;
    (big ? major : minor).push(spoke(angle, big ? 12.4 : 15.2, 17.6));
  }
  return { minor: minor.join(""), major: major.join("") };
}

const dialTicks = ticks(4);
export const tickMinor = dialTicks.minor;
export const tickMajor = dialTicks.major;
export const hubRing = ringPath(3.6);
export const majorInner = ringPath(12.4);
export const tickInner = ringPath(15.2);
export const tickOuter = ringPath(17.6);
export const bezelRing = ringPath(21.5);

export const restDial = {
  needle: needlePath(REST_READING),
  minTab: spoke(dialAngle(RANGE_MIN), 15.2, 25.2),
  maxTab: spoke(dialAngle(RANGE_MAX), 15.2, 27.4),
  band: bandPath(RANGE_MAX),
  needleTip: tabTip(REST_READING, 13.4),
  minTip: tabTip(RANGE_MIN, 25.2),
  maxTip: tabTip(RANGE_MAX, 27.4),
};

export const feet = corners(PLATE, 18)
  .map((at) => ({ at, depth: depthOf([at[0], at[1], 0], P) }))
  .sort((a, b) => a.depth - b.depth);

export const plateScrews = corners(PLATE, 10);

function cyl(cx: number, cy: number, radius: number, z: number, height: number, steps = 24, bevel = 0) {
  return cylinder(cx, cy, radius, z, height, P, steps, bevel);
}

/** A coin standing on the y axis, face toward the near side. */
function diskY(cx: number, cz: number, y: number, radius: number, thick: number, steps = 36): SolidPaths {
  const at = (yy: number, angle: number): Point3 => [
    cx + Math.cos(angle) * radius,
    yy,
    cz + Math.sin(angle) * radius,
  ];
  const front = Array.from({ length: steps }, (_, index) => iso(at(y + thick, (index / steps) * Math.PI * 2), P));
  const back = Array.from({ length: steps }, (_, index) => iso(at(y, (index / steps) * Math.PI * 2), P));
  const { cosA } = cameraOf(P);
  const [vx, vy] = towardViewer(P);
  const shades: string[][] = [[], [], [], []];
  for (let index = 0; index < steps; index++) {
    const angle = (index / steps) * Math.PI * 2;
    const nx = Math.cos(angle);
    const nz = Math.sin(angle);
    if (nx * vx + nz * 0 + 0 * vy <= 0.08 * (1 + cosA)) continue;
    const lit = Math.min(3, Math.max(0, Math.floor(((nx + 1) / 2) * 4)));
    const next = (index + 1) % steps;
    shades[lit]!.push(pathOf([front[index]!, front[next]!, back[next]!, back[index]!], true));
  }
  return {
    fill: pathOf(front, true),
    top: pathOf(front, true),
    outline: pathOf(front, true),
    crease: "",
    shades: shades.map((paths) => paths.join("")),
  };
}

export interface Part {
  paths: SolidPaths;
  tone?: "hi" | "mid" | "lo";
  crease?: "faint" | "none";
}

export const footFlange = (at: [number, number]) => cyl(at[0], at[1], 6.2, -FOOT, 1.5, 20);
export const footBody = (at: [number, number]) => cyl(at[0], at[1], 4.6, -FOOT + 1.5, FOOT - 1.5, 20);

export const plate: Part = { paths: slabOf(PLATE, 0, PLATE_H, P, 8, 1.3), tone: "mid" };
export const plateGroove = planOutline({ x: PLATE.x + 5, y: PLATE.y + 5, w: PLATE.w - 10, d: PLATE.d - 10, r: 4 }, PLATE_H, P);
export const screwRing = plateScrews.map(([x, y]) => ring(x, y, 1.8, PLATE_H, P, 12)).join("");
export const screwDots = plateScrews.map(([x, y]) => iso([x, y, PLATE_H], P));

export const sensorNode = loraRadio(NODE_SPEC, P);
/** One line on the OLED, larger than the part's two-line glyph. */
export const sensorReadout = sensorNode.glyph * 1.55;
const canAt: [number, number] = [SENSOR_BOARD.x + 5.2, SENSOR_BOARD.y + 6.2];
export const sensorBoard: Part = { paths: slabOf(SENSOR_BOARD, PLATE_H, 1.35, P, 3), tone: "lo" };
export const sensorCan: Part = { paths: cyl(canAt[0], canAt[1], 2.3, PLATE_H + 1.35, 1.7, 14), tone: "hi", crease: "none" };
const headerX = SENSOR_BOARD.x + SENSOR_BOARD.w - 1.6;
export const sensorPins = [2.2, 5.2, 8.2, 11.2].map((dy) => cyl(headerX, SENSOR_BOARD.y + dy, 0.7, PLATE_H + 1.35, 2.4, 8));
const jack: Point3 = [NODE_SPEC.x, NODE_SPEC.y + 30 * (NODE_SPEC.scale ?? 1) * 0.5, PLATE_H + 4.2];
const pad: Point3 = [SENSOR_BOARD.x + SENSOR_BOARD.w, SENSOR_BOARD.y + 7, PLATE_H + 3.6];
export const leadFrom = iso(jack, P);
export const leadTo = iso(pad, P);
export const leadVia = [iso([(jack[0] + pad[0]) / 2, (jack[1] + pad[1]) / 2, PLATE_H + 5.5], P)];
export const sensorRings = airRings(sensorNode.antennaTip, [6, 11]);
export const sensorHop = airPacket(sensorNode.antennaTip, iso([GAUGE_X, FACE_Y, GAUGE_Z - 8], P), 14);

export const plinth: Part = { paths: slabOf({ x: -96, y: -2, w: 76, d: 28, r: 3 }, PLATE_H, 3.2, P, 4, 0.4), tone: "mid" };
export const postL: Part = { paths: cyl(-84, 10, 3.4, PLATE_H + 3.2, 16, 18), tone: "mid" };
export const postR: Part = { paths: cyl(-32, 10, 3.4, PLATE_H + 3.2, 16, 18), tone: "mid" };
export const brace: Part = { paths: slabOf({ x: -88, y: 7, w: 60, d: 6, r: 1.5 }, PLATE_H + 16, 3.4, P, 3, 0.3), tone: "lo" };
export const caseBody: Part = { paths: slabOf(CASE, CASE_Z, CASE_H, P, 5, 0.8), tone: "mid" };
export const caseSeam = sideSeam(CASE, CASE_Z + 18, P, 5);
export const caseBand = sideSeam(CASE, CASE_Z + CASE_H - 8, P, 5);
export const bezelDisk: Part = { paths: diskY(GAUGE_X, GAUGE_Z, 19.2, 24.5, 1.5), tone: "lo" };
export const glass: Part = { paths: diskY(GAUGE_X, GAUGE_Z, 20.6, 19.4, 0.5), tone: "hi" };

export const gaugeTerminal: Part = { paths: cyl(-22, 16, 2.2, PLATE_H, 3.2, 14), tone: "lo" };
export const bellTerminal: Part = { paths: cyl(BELL[0], BELL[1] + 16, 2.2, PLATE_H, 3.2, 14), tone: "lo" };
export const wireFrom = iso([-22, 16, PLATE_H + 3.2], P);
export const wireTo = iso([BELL[0], BELL[1] + 16, PLATE_H + 3.2], P);
export const wireVia = [iso([-22, 16, PLATE_H + 0.6], P), iso([BELL[0], 16, PLATE_H + 0.6], P), iso([BELL[0], BELL[1] + 16, PLATE_H + 0.6], P)];

const bellLipZ = BELL_POST + 8;
export const bellPost: Part = { paths: cyl(BELL[0], BELL[1], 3.3, PLATE_H, BELL_POST - PLATE_H, 18), tone: "mid", crease: "none" };
export const yoke: Part = { paths: slabOf({ x: BELL[0] - 4, y: BELL[1] - 5, w: 22, d: 8, r: 2 }, BELL_POST - 2, 5, P, 3, 0.4), tone: "mid" };
export const bellNeck: Part = { paths: cyl(BELL[0], BELL[1], 4.2, BELL_POST, 4, 20), tone: "mid" };
export const bellFlare: Part = { paths: cyl(BELL[0], BELL[1], 9, bellLipZ - 2, 3, 24), tone: "lo" };
export const bellLip: Part = { paths: cyl(BELL[0], BELL[1], 13.5, bellLipZ, 2.6, 28), tone: "mid" };
export const bellBody: Part = { paths: cyl(BELL[0], BELL[1], 11.2, bellLipZ + 2.6, 10, 28, 0.5), tone: "hi" };
export const bellShoulder: Part = { paths: cyl(BELL[0], BELL[1], 7.4, bellLipZ + 12.6, 4.2, 22), tone: "mid" };
export const bellCrown: Part = { paths: cyl(BELL[0], BELL[1], 2.6, bellLipZ + 16.8, 2.4, 14), tone: "lo" };
export const bellSeam = sideArc(BELL[0], BELL[1], 11.2, bellLipZ + 7, P, 18);
export const strikerArm: Part = {
  paths: slabOf({ x: BELL[0] + 12, y: BELL[1] - 1.4, w: 14, d: 2.8, r: 1.2 }, BELL_POST + 6, 1.8, P, 3),
  tone: "mid",
  crease: "none",
};
export const clapper: Part = { paths: cyl(BELL[0] + 26, BELL[1], 2.3, BELL_POST + 5, 3.6, 14), tone: "hi" };

const chuteX = -6;
const chuteY = -8;
export const chuteHigh: Part = { paths: slabOf({ x: chuteX, y: chuteY, w: 24, d: 16, r: 1.2 }, 20, 1.3, P, 3), tone: "lo", crease: "none" };
export const chuteMid: Part = { paths: slabOf({ x: chuteX + 2, y: chuteY + 14, w: 22, d: 16, r: 1.2 }, 14, 1.3, P, 3), tone: "lo", crease: "none" };
export const chuteLow: Part = { paths: slabOf({ x: chuteX + 4, y: chuteY + 28, w: 20, d: 14, r: 1.2 }, 9, 1.2, P, 3), tone: "lo", crease: "none" };
export const wallL: Part = { paths: slabOf({ x: chuteX, y: chuteY, w: 2, d: 46, r: 0.6 }, 9, 8, P, 2), tone: "mid" };
export const wallR: Part = { paths: slabOf({ x: chuteX + 22, y: chuteY, w: 2, d: 42, r: 0.6 }, 9, 6, P, 2), tone: "mid" };
export const tray: Part = { paths: slabOf({ x: chuteX + 2, y: chuteY + 42, w: 24, d: 10, r: 1.4 }, PLATE_H, 3.4, P, 3, 0.3), tone: "mid" };
export const envelope: Part = { paths: slabOf({ x: chuteX + 5, y: chuteY + 2, w: 14, d: 11, r: 1 }, 21.4, 1, P, 3), tone: "hi" };
export const flap: Part = { paths: slabOf({ x: chuteX + 5, y: chuteY + 2, w: 14, d: 4, r: 0.8 }, 22.4, 0.45, P, 2), tone: "lo", crease: "none" };
export const stamp: Part = { paths: slabOf({ x: chuteX + 8, y: chuteY + 7, w: 8, d: 4.5, r: 0.6 }, 22.4, 0.3, P, 2), tone: "mid", crease: "none" };

export function dropOf(amount: number) {
  return translateAlong(P, [2 * amount, 34 * amount, -12 * amount]);
}
export function strikeOf(amount: number) {
  return translateAlong(P, [-8 * amount, 0, 0]);
}
export function slideOf(reading: number) {
  return translateAlong(P, [(reading - REST_READING) * 0.85, 0, 0]);
}

export const rulePostL: Part = { paths: cyl(RULE.x + 8, RULE.y + 8, 2.6, PLATE_H, RULE_Z - PLATE_H, 14), tone: "mid" };
export const rulePostR: Part = { paths: cyl(RULE.x + RULE.w - 8, RULE.y + RULE.d - 8, 2.6, PLATE_H, RULE_Z - PLATE_H, 14), tone: "mid" };
export const ruleBed: Part = { paths: slabOf(RULE, RULE_Z, 3.2, P, 4, 0.35), tone: "mid" };
export const stator: Part = { paths: slabOf({ x: RULE.x + 4, y: RULE.y + 3, w: RULE.w - 8, d: RULE.d - 6, r: 1 }, RULE_Z + 3.2, 1.4, P, 3), tone: "lo", crease: "none" };
const ruleFrom = Math.ceil((RULE.x + 10) / 4) * 4;
const ruleTo = Math.floor((RULE.x + RULE.w - 10) / 4) * 4;
const input = topTicks(ruleFrom, ruleTo, 4, 5, RULE.y + 7, RULE_Z + 4.6, [3, 3], P);
const derived = topTicks(ruleFrom, ruleTo, 4, 5, RULE.y + RULE.d - 7, RULE_Z + 4.6, [-3, -3], P);
export const inputEdge = lineOnTop([ruleFrom, RULE.y + 7], [ruleTo, RULE.y + 7], RULE_Z + 4.6, P);
export const inputTip = lineOnTop([ruleFrom, RULE.y + 10], [ruleTo, RULE.y + 10], RULE_Z + 4.6, P);
export const derivedEdge = lineOnTop([ruleFrom, RULE.y + RULE.d - 7], [ruleTo, RULE.y + RULE.d - 7], RULE_Z + 4.6, P);
export const derivedTip = lineOnTop([ruleFrom, RULE.y + RULE.d - 10], [ruleTo, RULE.y + RULE.d - 10], RULE_Z + 4.6, P);
export const inputMinor = input.minor;
export const inputMajor = input.major;
export const derivedMinor = derived.minor;
export const derivedMajor = derived.major;
const slidePlan: Plan = { x: RULE.x + RULE.w / 2 - 8, y: RULE.y + 10, w: 16, d: 16, r: 1.2 };
export const slide: Part = { paths: slabOf(slidePlan, RULE_Z + 4.7, 1.8, P, 3, 0.25), tone: "hi" };
export const cursorBar: Part = {
  paths: slabOf({ x: RULE.x + RULE.w / 2 - 0.7, y: RULE.y + 4, w: 1.4, d: RULE.d - 8, r: 0.4 }, RULE_Z + 6.6, 1.1, P, 2),
  tone: "lo",
  crease: "none",
};
export const cheekA: Part = { paths: slabOf({ x: RULE.x + RULE.w / 2 - 3.2, y: RULE.y + 3, w: 6.4, d: 2.4, r: 0.6 }, RULE_Z + 6.5, 1.3, P, 2), tone: "mid" };
export const cheekB: Part = { paths: slabOf({ x: RULE.x + RULE.w / 2 - 3.2, y: RULE.y + RULE.d - 5.4, w: 6.4, d: 2.4, r: 0.6 }, RULE_Z + 6.5, 1.3, P, 2), tone: "mid" };
const knobAt: [number, number] = [slidePlan.x + 11, RULE.y + RULE.d / 2];
export const ruleKnob: Part = { paths: cyl(knobAt[0], knobAt[1], 2.6, RULE_Z + 6.6, 2.2, 16), tone: "mid" };
export const ruleKnurl = knurl(knobAt[0], knobAt[1], 2.6, RULE_Z + 6.6, RULE_Z + 8.8, 12, P, 0);
