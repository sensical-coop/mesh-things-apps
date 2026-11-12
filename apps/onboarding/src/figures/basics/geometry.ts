import {
  corners,
  cylinder,
  iso,
  pathOf,
  planOutline,
  sideSeam,
  slabOf,
  topMatrix,
  type Flat,
  type Plan,
  type Point3,
  type SolidPaths,
} from "@/iso/iso-kit";
import { airPacket, airRings, pointOnRoute, wifiArcs } from "../parts/air-waves";
import { LORA_CASE, antennaPoint, loraRadio, loraRadioBounds } from "../parts/lora-radio";
import { hugProjection } from "../view";
import { BENCH, BROKER, DB, GATE_SPEC, NODE_SPECS } from "./model";

const BOUNDS: Point3[] = [
  [BENCH.x - 6, BENCH.y - 4, 0],
  [BENCH.x + BENCH.w + 8, BENCH.y - 4, 0],
  [BENCH.x - 6, BENCH.y + BENCH.d + 8, 0],
  [BENCH.x + BENCH.w + 8, BENCH.y + BENCH.d + 8, 0],
  ...NODE_SPECS.flatMap((spec) => {
    const tip = antennaPoint(spec);
    return [...loraRadioBounds(spec), [tip[0], tip[1], tip[2] + 16] as Point3];
  }),
  ...(() => {
    const tip = antennaPoint(GATE_SPEC);
    return [...loraRadioBounds(GATE_SPEC), [tip[0], tip[1], tip[2] + 16] as Point3];
  })(),
];

/** Same scale as the other figures, but the viewBox hugs the bench, so the full-width plate draws it larger. */
const hugged = hugProjection(BOUNDS, 10);
export const P = hugged.projection;
export const WIDTH = hugged.width;
export const HEIGHT = hugged.height;

const TOP = BENCH.h;
const box = (plan: Plan, z: number, h: number): SolidPaths => slabOf(plan, z, h, P, 2, 0);
const tube = (cx: number, cy: number, r: number, z: number, h: number) => cylinder(cx, cy, r, z, h, P, 18, 0);

function feet(plan: Plan, z: number, h: number): SolidPaths[] {
  return corners(plan, 10).map(([x, y]) => box({ x: x - 7, y: y - 7, w: 14, d: 14, r: 1.2 }, z, h));
}

const BENCH_PLAN: Plan = { x: BENCH.x, y: BENCH.y, w: BENCH.w, d: BENCH.d, r: 5 };

export const BASE = {
  feet: feet(BENCH_PLAN, 0, 4),
  pads: feet(BENCH_PLAN, 4, 1.6),
  slab: box(BENCH_PLAN, 5.6, TOP - 5.6),
  groove: planOutline({ x: BENCH.x + 4, y: BENCH.y + 4, w: BENCH.w - 8, d: BENCH.d - 8, r: 3 }, TOP, P),
  screws: corners(BENCH_PLAN, 9).map(([x, y]) => iso([x, y, TOP], P)),
  label: box({ x: BENCH.x + 48, y: BENCH.y + BENCH.d - 16, w: 36, d: 10, r: 1 }, TOP, 1.4),
  halo: slabOf({ x: BENCH.x - 8, y: BENCH.y - 6, w: BENCH.w + 18, d: BENCH.d + 14, r: 10 }, 0, 1, P).fill,
};

export const RADIOS = NODE_SPECS.map((spec) => loraRadio(spec, P));

function sideSlots(x: number, y0: number, y1: number, z: number, h: number): string {
  const step = (y1 - y0) / 3;
  return [0, 1, 2]
    .map((index) => {
      const y = y0 + step * index + step * 0.22;
      const d = step * 0.46;
      return pathOf(
        [iso([x, y, z], P), iso([x, y + d, z], P), iso([x, y + d, z + h], P), iso([x, y, z + h], P)],
        true,
      );
    })
    .join("");
}

const gateFoot = {
  x: GATE_SPEC.x,
  y: GATE_SPEC.y,
  w: LORA_CASE.length * (GATE_SPEC.scale ?? 1),
  d: LORA_CASE.width * (GATE_SPEC.scale ?? 1),
  r: 1.2,
};

export const GATE = {
  plinth: box({ x: gateFoot.x + 2, y: gateFoot.y + 2, w: gateFoot.w - 4, d: gateFoot.d - 4, r: 1.2 }, TOP, 3),
  radio: loraRadio(GATE_SPEC, P),
};

const brZ = TOP;
const br: Plan = { x: BROKER.x, y: BROKER.y, w: BROKER.w, d: BROKER.d, r: 1.4 };
const port: Plan = { x: BROKER.x + 8, y: BROKER.y + BROKER.d - 1, w: 14, d: 7, r: 0.6 };
const brokerPlate: Plan = { x: BROKER.x + BROKER.w - 1.2, y: BROKER.y + 8, w: 1.6, d: 26, r: 0.3 };

export const SORT = {
  body: box(br, brZ, BROKER.h),
  seam: sideSeam(br, brZ + BROKER.h - 2.2, P),
  screws: [
    ...corners(br, 3).map(([x, y]) => iso([x, y, brZ + BROKER.h], P)),
    iso([BROKER.x + BROKER.w, BROKER.y + 4, brZ + 4], P),
    iso([BROKER.x + BROKER.w, BROKER.y + BROKER.d - 4, brZ + 4], P),
    iso([BROKER.x + BROKER.w, BROKER.y + 4, brZ + BROKER.h - 4], P),
    iso([BROKER.x + BROKER.w, BROKER.y + BROKER.d - 4, brZ + BROKER.h - 4], P),
  ],
  vents: sideSlots(BROKER.x + BROKER.w, BROKER.y + 6, BROKER.y + BROKER.d - 6, brZ + 6, 10),
  plate: box(brokerPlate, brZ + 8, 12),
  rules: [0.28, 0.5, 0.72]
    .map((t) => {
      const z = brZ + 8 + 12 * t;
      const x = brokerPlate.x + brokerPlate.w;
      return pathOf([iso([x, brokerPlate.y, z], P), iso([x, brokerPlate.y + brokerPlate.d, z], P)]);
    })
    .join(""),
  leds: [10, 20, 30].map((dx) => box({ x: BROKER.x + dx, y: BROKER.y + BROKER.d - 1, w: 4, d: 2.2, r: 0.4 }, brZ + 8, 4)),
  port: box(port, brZ + 10, 8),
};

const PORT_AT: Flat = iso([port.x + port.w / 2, port.y + port.d, brZ + 18], P);
export const SORT_LABEL = topMatrix([BROKER.x + 8, BROKER.y + 10], brZ + BROKER.h, P, "x");

export const STORE = {
  discs: [0, 1, 2].map((index) => tube(DB.cx, DB.cy, DB.r, TOP + index * (DB.disc + DB.gap), DB.disc)),
};

const dbTop: Flat = iso([DB.cx, DB.cy, TOP + 3 * DB.disc + 2 * DB.gap], P);
const brokerTop: Flat = iso([BROKER.x + BROKER.w / 2, BROKER.y + BROKER.d / 2, brZ + BROKER.h], P);

export const INGEST = airPacket(brokerTop, dbTop, 14);

const nodeTip = (index: number): Flat => {
  const tip = RADIOS[index]?.antennaTip;
  if (!tip) throw new Error("radio");
  return tip;
};

const source = nodeTip(0);
const gateTip = GATE.radio.antennaTip;

const LIFT = 8;
export const MESH_LINKS = [airPacket(source, nodeTip(1), LIFT).d, airPacket(nodeTip(1), gateTip, LIFT).d];

export const PACKET = airPacket(source, gateTip, LIFT);

export const NODE_RINGS = RADIOS.flatMap((radio) => airRings(radio.antennaTip, [5, 9, 13]));
export const GATE_RINGS = airRings(gateTip, [6, 11, 16]);

const wifiFrom = GATE.radio.usbAt;
const wifiStop: Flat = [
  wifiFrom[0] + (PORT_AT[0] - wifiFrom[0]) * 0.62,
  wifiFrom[1] + (PORT_AT[1] - wifiFrom[1]) * 0.62,
];
export const WIFI = wifiArcs(wifiFrom, PORT_AT, [7, 12, 17]);
export const UPLINK = airPacket(wifiFrom, wifiStop, 18);

const ROUTE = [
  PACKET,
  airPacket(gateTip, wifiFrom, 0),
  UPLINK,
  airPacket(wifiStop, PORT_AT, 0),
  airPacket(PORT_AT, brokerTop, 0),
  INGEST,
];

export const ROUTE_START: Flat = PACKET.at(0);

function routeAt(progress: number): Flat {
  return pointOnRoute(ROUTE, progress);
}

export function packetTransform(progress: number): string {
  const at = routeAt(progress);
  return `translate(${(at[0] - ROUTE_START[0]).toFixed(2)} ${(at[1] - ROUTE_START[1]).toFixed(2)})`;
}

function checkRoute(): void {
  const end = routeAt(1);
  if (routeAt(0)[0] !== ROUTE_START[0] || Math.hypot(end[0] - dbTop[0], end[1] - dbTop[1]) > 0.5) throw new Error("route");
}

checkRoute();
