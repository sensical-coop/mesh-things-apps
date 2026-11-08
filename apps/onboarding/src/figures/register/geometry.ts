import { depthOf, iso, segment, sideMatrix, sideRing, slabOf, type Plan, type Point3, type SolidPaths, type Tone } from "@/iso/iso-kit";
import { loraRadio, loraRadioBounds, type LoraRadioParts, type LoraRadioSpec } from "../parts/lora-radio";
import { stepProjection } from "../view";
import { WHEEL_COUNT } from "./model";

export interface Piece {
  paths: SolidPaths;
  tone: Tone;
  flat?: boolean;
}

export interface WheelArt {
  index: number;
  face: SolidPaths;
  band: SolidPaths;
  rings: string;
  ticks: string;
  clip: string;
  label: string;
  at: [number, number];
}

const SCALE = 1.02;
const BENCH = 5.5;
const RADIO_SPEC: LoraRadioSpec = { x: 12, y: 14, z: BENCH, scale: SCALE, facing: "x" };

const wheelR = 6.2;
const band = 1.35;
const wheelY = 30;
const wheelZ = BENCH + 8.2;
const pitch = 10;
const wheelX0 = 86;

const wheelXs: number[] = [];
for (let index = 0; index < WHEEL_COUNT; index++) wheelXs.push(wheelX0 + index * pitch);

const housing: Plan = { x: 78, y: 18, w: 84, d: 24, r: 1.4 };
const bench: Plan = { x: 4, y: 6, w: 168, d: 52, r: 3 };

const bounds: Point3[] = [
  ...loraRadioBounds(RADIO_SPEC),
  [bench.x, bench.y, 0],
  [bench.x + bench.w, bench.y, 0],
  [bench.x, bench.y + bench.d, 0],
  [bench.x + bench.w, bench.y + bench.d, BENCH],
];
for (const x of wheelXs) bounds.push([x, wheelY, wheelZ + wheelR + band]);

const projection = stepProjection(bounds);

function piece(paths: SolidPaths, tone: Tone, flat?: boolean): Piece {
  return flat ? { paths, tone, flat } : { paths, tone };
}

function box(plan: Plan, z: number, height: number, tone: Tone, bevel = 0.3): Piece {
  return piece(slabOf(plan, z, height, projection, 5, bevel), tone);
}

function disc(x: number, radius: number): SolidPaths {
  const cap = sideRing([x, wheelY, wheelZ], radius, "x", projection, 24);
  return { fill: cap, outline: cap, crease: "", top: "", shades: ["", "", "", ""], bevel: "" };
}

const still: Piece[] = [];
for (const [x, y] of [
  [bench.x + 3, bench.y + 3],
  [bench.x + bench.w - 14, bench.y + 3],
  [bench.x + 3, bench.y + bench.d - 12],
  [bench.x + bench.w - 14, bench.y + bench.d - 12],
] as const) {
  still.push(box({ x, y, w: 11, d: 9, r: 1.2 }, 0, 2, "mid", 0.15));
}
still.push(box(bench, 2, BENCH - 2, "hi", 0.3));
still.push(box(housing, BENCH, 6.4, "mid", 0.25));
still.push(piece(slabOf({ x: housing.x + 4, y: housing.y + 7, w: housing.w - 8, d: 10, r: 0.8 }, BENCH + 6.4, 0.7, projection, 4, 0), "lo"));
still.push(box({ x: housing.x, y: housing.y + 4, w: 5, d: 16, r: 0.6 }, BENCH, 11, "mid", 0.15));
still.push(box({ x: housing.x + housing.w - 5, y: housing.y + 4, w: 5, d: 16, r: 0.6 }, BENCH, 11, "mid", 0.15));
still.push(box({ x: 74, y: 26, w: 8, d: 3.2, r: 0.4 }, BENCH + 1.2, 1.1, "lo", 0));

const wheels: WheelArt[] = wheelXs.map((x, index) => {
  const faceX = x + 0.7;
  let ticks = "";
  for (let step = 0; step < 8; step++) {
    const angle = (step / 8) * Math.PI * 2;
    ticks += segment(
      [faceX, wheelY + Math.cos(angle) * wheelR, wheelZ + Math.sin(angle) * wheelR],
      [faceX, wheelY + Math.cos(angle) * (wheelR + band), wheelZ + Math.sin(angle) * (wheelR + band)],
      projection,
    );
  }
  return {
    index,
    face: disc(faceX, wheelR),
    band: disc(faceX, wheelR + band),
    rings:
      sideRing([faceX, wheelY, wheelZ], wheelR, "x", projection, 24) +
      sideRing([faceX, wheelY, wheelZ], wheelR + band, "x", projection, 24),
    ticks,
    clip: sideRing([faceX, wheelY, wheelZ], wheelR - 0.2, "x", projection, 24),
    label: sideMatrix([faceX, wheelY], wheelZ, projection, "right"),
    at: iso([faceX, wheelY, wheelZ], projection),
  };
});

wheels.sort((a, b) => depthOf([wheelXs[a.index] ?? 0, wheelY, wheelZ], projection) - depthOf([wheelXs[b.index] ?? 0, wheelY, wheelZ], projection));

const radio: LoraRadioParts = loraRadio(RADIO_SPEC, projection);
const glyph = radio.glyph;

export const scene = {
  still,
  radio,
  wheels,
  screenType: { short: glyph * 0.85, id: glyph * 0.57, gap: glyph * 0.96, inset: glyph * 0.14 },
  wheelGlyph: 7,
};

if (wheelXs.length !== WHEEL_COUNT) throw new Error("register figure: wheel count");
