import {
  AZIMUTH,
  ELEVATION,
  cylinder,
  iso,
  planOutline,
  ring,
  segment,
  sideSeam,
  slabOf,
  topMatrix,
  type Plan,
  type Point3,
  type Projection,
  type SolidPaths,
} from "@/iso/iso-kit";
import { airPacket, wifiArcs } from "../parts/air-waves";
import { antennaPoint, loraRadio } from "../parts/lora-radio";
import { FIGURE_HEIGHT, FIGURE_WIDTH } from "../view";

/** Centre the real extents in the 480×240 view with about 8px of margin. */
function fitBounds(points: Point3[]): Projection {
  const pad = 8;
  const bare: Projection = { origin: [0, 0], scale: 1, azimuth: AZIMUTH, elevation: ELEVATION };
  const raw = points.map((point) => iso(point, bare));
  const xs = raw.map(([x]) => x);
  const ys = raw.map(([, y]) => y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const scale = Math.min((FIGURE_WIDTH - pad * 2) / spanX, (FIGURE_HEIGHT - pad * 2) / spanY);
  const sized: Projection = { origin: [0, 0], scale, azimuth: AZIMUTH, elevation: ELEVATION };
  const placed = points.map((point) => iso(point, sized));
  const px = placed.map(([x]) => x);
  const py = placed.map(([, y]) => y);
  return {
    origin: [FIGURE_WIDTH / 2 - (Math.min(...px) + Math.max(...px)) / 2, FIGURE_HEIGHT / 2 - (Math.min(...py) + Math.max(...py)) / 2],
    scale,
    azimuth: AZIMUTH,
    elevation: ELEVATION,
  };
}

const PLATE_Z = 5;
export const RADIO_SPEC = { x: 0, y: 0, z: PLATE_Z, scale: 1.32, facing: "x" as const };
const PHONE: Plan = { x: 86, y: 0, w: 52, d: 78, r: 6 };
const PHONE_H = 8;
const BROKER: Plan = { x: 146, y: 4, w: 32, d: 26, r: 1.6 };
const BROKER_H = 16;
const PLATE: Plan = { x: -8, y: -8, w: 196, d: 94, r: 5 };

const tip = antennaPoint(RADIO_SPEC);
const benchCorners: Array<[number, number]> = [
  [PLATE.x, PLATE.y],
  [PLATE.x + PLATE.w, PLATE.y],
  [PLATE.x, PLATE.y + PLATE.d],
  [PLATE.x + PLATE.w, PLATE.y + PLATE.d],
];
const bounds: Point3[] = [...benchCorners.flatMap(([x, y]) => [[x, y, 0], [x, y, PLATE_Z]] as Point3[]), tip];

export const P = fitBounds(bounds);

const box = (plan: Plan, z: number, h: number): SolidPaths => slabOf(plan, z, h, P, 4, 0.4);

export const PLATE_BODY = box(PLATE, 0, PLATE_Z);
export const PLATE_GROOVE = planOutline({ x: PLATE.x + 5, y: PLATE.y + 5, w: PLATE.w - 10, d: PLATE.d - 10, r: 4 }, PLATE_Z, P);

export const GATE = loraRadio(RADIO_SPEC, P);

const bezel = 1.8;
const screen: Plan = { x: PHONE.x + bezel, y: PHONE.y + bezel, w: PHONE.w - bezel * 2, d: PHONE.d - bezel * 2, r: 2.2 };
const screenZ = PLATE_Z + PHONE_H;

export const PHONE_BODY = box(PHONE, PLATE_Z, PHONE_H);
export const PHONE_SCREEN = box(screen, screenZ, 0.35);
export const PHONE_RIM = planOutline(screen, screenZ + 0.35, P);
const notch: Plan = { x: PHONE.x + PHONE.w / 2 - 4.2, y: PHONE.y + bezel + 0.4, w: 8.4, d: 2.2, r: 1.1 };
export const PHONE_NOTCH = box(notch, screenZ + 0.35, 0.25);
export const PHONE_DOT = iso([PHONE.x + PHONE.w / 2, PHONE.y + bezel + 1.5, screenZ + 0.7], P);

export const TOGGLE_OFF = 0;
export const TOGGLE_ON = 1;

/** Screen plane: 1 unit matches world units along the glass. Rows run with the labels. */
export const SCREEN_AT = topMatrix([screen.x, screen.y], screenZ + 0.55, P);
/** Stack along the screen's long axis so a pill stays on its label's row. */
export const ROW_Y = [14, 40, 66];
export const PILL = { x: screen.w * 0.58, w: screen.w / 3, h: 6.2 };
export const KNOB_R = 2.15;
export const KNOB_TRAVEL = PILL.w - KNOB_R * 2 - 1.6;

const phoneEdge: Point3 = [PHONE.x + 8, PHONE.y - 1, PLATE_Z + 8];
const radioEdge: Point3 = [RADIO_SPEC.x + 60 * RADIO_SPEC.scale - 4, RADIO_SPEC.y + 30 * RADIO_SPEC.scale + 2, PLATE_Z + 8];
export const BLE = segment(radioEdge, phoneEdge, P);

export const BROKER_BODY = box(BROKER, PLATE_Z, BROKER_H);
export const BROKER_SEAM = sideSeam(BROKER, PLATE_Z + BROKER_H - 2, P);
export const BROKER_LABEL = topMatrix([BROKER.x + 6, BROKER.y + 8], PLATE_Z + BROKER_H, P);

const lampX = BROKER.x + BROKER.w - 12;
const lampY = BROKER.y + 12;
const lampZ = PLATE_Z + BROKER_H;
export const LAMP_LENS = { paths: cylinder(lampX, lampY, 3.6, lampZ, 1.5, P, 18), tone: "lo" as const };
export const LAMP_RING = ring(lampX, lampY, 3.6, lampZ + 1.5, P, 18);
export const LAMP_GLOW = ring(lampX, lampY, 6.4, lampZ + 1.6, P, 22);

const brokerFace: Point3 = [BROKER.x, BROKER.y + BROKER.d / 2, PLATE_Z + BROKER_H * 0.55];
const brokerAt = iso(brokerFace, P);
const wifiFrom = iso([RADIO_SPEC.x + 60 * RADIO_SPEC.scale * 0.78, RADIO_SPEC.y + 8, PLATE_Z + 16 * RADIO_SPEC.scale + 5], P);
export const WIFI = wifiArcs(wifiFrom, brokerAt, [8, 13, 18]);
export const HOP = airPacket(wifiFrom, brokerAt, 14);
export const FLOW = HOP.d;
