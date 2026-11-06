import {
  boxCorners,
  corners,
  cylinder,
  insetPlan,
  iso,
  knurl,
  lineOnTop,
  planOutline,
  radialTicks,
  ring,
  sideArc,
  slabOf,
  topMatrix,
  topTicks,
  type Point3,
  type SolidPaths,
} from "@/iso/iso-kit";
import { FIGURE_HEIGHT, FIGURE_WIDTH, stepProjection } from "../view";

export { FIGURE_HEIGHT, FIGURE_WIDTH };

export const PLATE = { x: -112, y: -46, w: 236, d: 92, r: 6 };
export const PLATE_Z = 4;
export const PLATE_H = 7;

export const BOX = { x: -92, y: -20, w: 112, d: 36, r: 1.2 };
export const BOX_Z = 50;
export const WALL_H = 20;
export const ARCH_R = 15;

export const POST: [number, number] = [BOX.x + BOX.w * 0.46, BOX.y + BOX.d * 0.42];
export const POST_R = 5.2;

export const DIAL = { x: 46, y: -2, r: 18, z: 34, h: 9 };
export const SWEEP_FROM = -0.55;
export const SWEEP = Math.PI * 1.2;

export const ENV = { x: BOX.x + 28, y: BOX.y + 8, w: 36, d: 16, r: 0.6 };
export const ENV_Z = BOX_Z + WALL_H + 6;
export const ENV_H = 2.4;

export const FLAG_PIVOT: Point3 = [BOX.x + BOX.w + 1.6, BOX.y + 9, BOX_Z + WALL_H + 4];

const archTop = BOX_Z + WALL_H + ARCH_R;
const bounds: Point3[] = [
  ...boxCorners(PLATE, 0, PLATE_Z + PLATE_H),
  [BOX.x - 6, BOX.y - 4, archTop + 8],
  [BOX.x + BOX.w + 16, BOX.y + BOX.d + 28, BOX_Z],
  [FLAG_PIVOT[0], FLAG_PIVOT[1] - 8, FLAG_PIVOT[2] + 22],
  [FLAG_PIVOT[0], FLAG_PIVOT[1] + 20, FLAG_PIVOT[2] - 16],
  [ENV.x, ENV.y, ENV_Z + 40],
  [DIAL.x - DIAL.r - 8, DIAL.y - DIAL.r - 4, PLATE_Z],
  [DIAL.x + DIAL.r + 8, DIAL.y + DIAL.r + 4, DIAL.z + DIAL.h + 6],
  [POST[0], BOX.y + BOX.d + 8, BOX_Z - 10],
];

export const P = stepProjection(bounds);
export const at = (point: Point3) => iso(point, P);

const feet = corners(PLATE, 14);
export const footArt: SolidPaths[] = feet.flatMap(([x, y]) => [
  cylinder(x, y, 5.2, 0, 1.8, P, 22),
  cylinder(x, y, 3.6, 1.8, PLATE_Z - 1.8, P, 22),
]);

export const plate = slabOf(PLATE, PLATE_Z, PLATE_H, P, 8, 1.2);
export const plateGroove = planOutline(insetPlan(PLATE, 5), PLATE_Z + PLATE_H, P);
export const plateScrews = corners(PLATE, 9).map(([x, y]) => iso([x, y, PLATE_Z + PLATE_H], P));
export const screwRings = corners(PLATE, 9)
  .map(([x, y]) => ring(x, y, 2.1, PLATE_Z + PLATE_H, P, 16))
  .join("");

const strip = { x: PLATE.x + PLATE.w - 78, y: PLATE.y + 6, w: 62, d: 6, r: 0.8 };
export const ruler = slabOf(strip, PLATE_Z + PLATE_H, 0.6, P, 3);
export const rulerTicks = topTicks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y + 0.8, PLATE_Z + PLATE_H + 0.6, [1.8, 3.2], P);

const label = { x: PLATE.x + 16, y: PLATE.y + 7, w: 46, d: 16, r: 1 };
export const labelPlate = slabOf(label, PLATE_Z + PLATE_H, 0.7, P, 3);
const labelZ = PLATE_Z + PLATE_H + 0.7;
export const labelRules = [0.28, 0.52, 0.76]
  .map((t) => lineOnTop([label.x + 4, label.y + label.d * t], [label.x + label.w - 4, label.y + label.d * t], labelZ, P))
  .join("");
export const labelDots = [0.28, 0.52, 0.76].flatMap((t) => [
  iso([label.x + 4, label.y + label.d * t, labelZ], P),
  iso([label.x + label.w - 4, label.y + label.d * t, labelZ], P),
]);

export const flange = cylinder(POST[0], POST[1], 11, PLATE_Z + PLATE_H, 2.4, P, 28);
const boltRing = 7.2;
export const flangeBolts = [0.4, 1.9, 3.5, 5.1].map((turn) =>
  cylinder(POST[0] + Math.cos(turn) * boltRing, POST[1] + Math.sin(turn) * boltRing, 1.35, PLATE_Z + PLATE_H + 2.4, 1.3, P, 12),
);
export const post = cylinder(POST[0], POST[1], POST_R, PLATE_Z + PLATE_H + 2.4, BOX_Z - 8 - PLATE_Z - PLATE_H, P, 28);
export const postBands = [0.35, 0.7]
  .map((t) => sideArc(POST[0], POST[1], POST_R, PLATE_Z + PLATE_H + 2.4 + (BOX_Z - 8 - PLATE_Z - PLATE_H) * t, P, 16))
  .join("");

const bracket = { x: POST[0] - 16, y: POST[1] - 9, w: 32, d: 18, r: 2 };
export const bracketArt = slabOf(bracket, BOX_Z - 5.5, 5.5, P, 4, 0.45);
export const bracketStrap = slabOf({ x: BOX.x + 8, y: POST[1] - 3.2, w: BOX.w - 16, d: 6.4, r: 1 }, BOX_Z - 2.2, 2.2, P, 3);

const lampY = BOX.y + BOX.d + 3.2;
export const lampArm = slabOf({ x: POST[0] - 2.2, y: POST[1], w: 4.4, d: lampY - POST[1], r: 1 }, BOX_Z - 9, 3.2, P, 2);
export const lampHouse = cylinder(POST[0], lampY, 3.6, BOX_Z - 11, 5.2, P, 20);
export const lampLens = cylinder(POST[0], lampY, 2.2, BOX_Z - 5.8, 2.2, P, 16);

export const box = slabOf(BOX, BOX_Z, WALL_H, P, 4, 0.6);
export const boxSeam = planOutline(insetPlan(BOX, 2.4), BOX_Z + WALL_H, P, 4);

const archCy = BOX.y + BOX.d / 2;
const archCz = BOX_Z + WALL_H;
const archSteps = 5;
export const archBands: SolidPaths[] = Array.from({ length: archSteps }, (_, index) => {
  const h0 = (ARCH_R * index) / archSteps;
  const h1 = (ARCH_R * (index + 1)) / archSteps;
  const half = Math.sqrt(Math.max(1.2, ARCH_R * ARCH_R - h0 * h0));
  return slabOf(
    { x: BOX.x + 1.4, y: archCy - half, w: BOX.w - 2.8, d: half * 2, r: 0.8 },
    archCz + h0,
    Math.max(0.8, h1 - h0),
    P,
    3,
  );
});

export const slotMouth = slabOf({ x: BOX.x + 34, y: archCy - 1.6, w: 28, d: 3.2, r: 0.4 }, archCz + ARCH_R * 0.72, 1.1, P, 2);

export const flagBolt = cylinder(FLAG_PIVOT[0], FLAG_PIVOT[1], 1.7, FLAG_PIVOT[2] - 1.1, 2.2, P, 14);
export const flagStop = slabOf({ x: FLAG_PIVOT[0] - 1, y: FLAG_PIVOT[1] - 2.4, w: 2.4, d: 3.6, r: 0.4 }, FLAG_PIVOT[2] + 1.4, 2.6, P, 2);

const hingeY = BOX.y + BOX.d + 1.1;
const hingeZ = BOX_Z + 1.2;
export const hingeBarrels = [BOX.x + 14, BOX.x + BOX.w / 2, BOX.x + BOX.w - 14].map((x) =>
  cylinder(x, hingeY, 1.55, hingeZ, 3.4, P, 14),
);

const dialFoot = { x: DIAL.x - 11, y: DIAL.y - 11, w: 22, d: 22, r: 2 };
export const dialFootArt = slabOf(dialFoot, PLATE_Z + PLATE_H, 3, P, 4, 0.45);
export const dialStem = cylinder(DIAL.x, DIAL.y, 4, PLATE_Z + PLATE_H + 3, DIAL.z - 6 - PLATE_Z - PLATE_H, P, 22);
export const dialClamp = slabOf({ x: DIAL.x - 8, y: DIAL.y - 8, w: 16, d: 16, r: 1.6 }, DIAL.z - 6, 6, P, 4, 0.4);
export const dialBody = cylinder(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, P, 52, 0.7);
export const dialKnurl = knurl(DIAL.x, DIAL.y, DIAL.r, DIAL.z + DIAL.h - 2.6, DIAL.z + DIAL.h, 56, P, 0.28);
export const dialBezel = ring(DIAL.x, DIAL.y, DIAL.r - 1.8, DIAL.z + DIAL.h, P, 52);
export const dialFace = ring(DIAL.x, DIAL.y, DIAL.r - 4, DIAL.z + DIAL.h, P, 44);
export const dialTicks = radialTicks(DIAL.x, DIAL.y, DIAL.r - 4.4, 12, 3, DIAL.z + DIAL.h, [1.7, 3.1], P, SWEEP_FROM, SWEEP);
export const dialHub = cylinder(DIAL.x, DIAL.y, 1.5, DIAL.z + DIAL.h, 0.8, P, 14);
export const numeralAt = topMatrix(
  [DIAL.x + Math.cos(SWEEP_FROM) * (DIAL.r - 7.2), DIAL.y + Math.sin(SWEEP_FROM) * (DIAL.r - 7.2)],
  DIAL.z + DIAL.h + 0.15,
  P,
);

const crownX = DIAL.x + DIAL.r + 1.4;
const crownY = DIAL.y - 2;
export const crownStem = slabOf({ x: DIAL.x + DIAL.r - 1.2, y: crownY - 1.6, w: 3.4, d: 3.2, r: 0.6 }, DIAL.z + 2.2, 3.4, P, 2);
export const crownKnob = cylinder(crownX, crownY, 2.8, DIAL.z + 1.4, 5.4, P, 18);
export const crownKnurl = knurl(crownX, crownY, 2.8, DIAL.z + 1.4, DIAL.z + 6.8, 18, P);

export const envelope = slabOf(ENV, ENV_Z, ENV_H, P, 3, 0.3);
const flapTip: Point3 = [ENV.x + ENV.w / 2, ENV.y + ENV.d * 0.7, ENV_Z + ENV_H];
export const envelopeFlap =
  lineOnTop([ENV.x, ENV.y], [flapTip[0], flapTip[1]], ENV_Z + ENV_H, P) +
  lineOnTop([ENV.x + ENV.w, ENV.y], [flapTip[0], flapTip[1]], ENV_Z + ENV_H, P);
export const envelopeLines = [0.35, 0.55, 0.75]
  .map((t) => lineOnTop([ENV.x + 3, ENV.y + ENV.d * t], [ENV.x + ENV.w - 3, ENV.y + ENV.d * t], ENV_Z + ENV_H, P))
  .join("");
export const envelopeDots = [
  iso([ENV.x, ENV.y, ENV_Z + ENV_H], P),
  iso([ENV.x + ENV.w, ENV.y, ENV_Z + ENV_H], P),
  iso(flapTip, P),
  ...[0.35, 0.55, 0.75].flatMap((t) => [
    iso([ENV.x + 3, ENV.y + ENV.d * t, ENV_Z + ENV_H], P),
    iso([ENV.x + ENV.w - 3, ENV.y + ENV.d * t, ENV_Z + ENV_H], P),
  ]),
];

export const needleHubAt = iso([DIAL.x, DIAL.y, DIAL.z + DIAL.h + 0.4], P);
