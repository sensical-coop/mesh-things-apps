import {
  cylinder,
  iso,
  planOutline,
  sideRing,
  sideSeam,
  slabOf,
  topMatrix,
  type Flat,
  type Plan,
  type Point3,
  type Projection,
  type SolidPaths,
} from "../../iso/iso-kit.ts";

/** Case at scale 1, in world units. A printed node is about 60×30×16 mm. */
export const LORA_CASE = { length: 60, width: 30, height: 16 } as const;

export type LoraRadioSpec = {
  x: number;
  y: number;
  z: number;
  /** 1 draws {@link LORA_CASE}. Defaults to 1. */
  scale?: number;
  /** Long axis of the case. USB-C is on the far short end, the antenna on the near one. Defaults to "x". */
  facing?: "x" | "y";
};

export type LoraRadioParts = {
  body: SolidPaths;
  seam: string;
  window: SolidPaths;
  windowRim: string;
  button: SolidPaths;
  led: SolidPaths;
  usb: SolidPaths;
  usbMouth: string;
  boss: SolidPaths;
  sma: SolidPaths;
  sleeve: SolidPaths;
  whip: SolidPaths;
  antennaTip: Flat;
  /** `topMatrix` for the OLED, origin at the window's near corner, along the long axis. */
  screen: string;
  /** Glyph size in that matrix, sized for two short lines. */
  glyph: number;
  usbAt: Flat;
  ledAt: Flat;
  footprint: Plan;
};

type Built = {
  scale: number;
  facing: "x" | "y";
  length: number;
  width: number;
  height: number;
  w: number;
  d: number;
  x: number;
  y: number;
  z: number;
  ax: number;
  ay: number;
  whip: number;
};

function builtOf(spec: LoraRadioSpec): Built {
  const scale = spec.scale ?? 1;
  const facing = spec.facing ?? "x";
  const length = LORA_CASE.length * scale;
  const width = LORA_CASE.width * scale;
  const height = LORA_CASE.height * scale;
  const w = facing === "x" ? length : width;
  const d = facing === "x" ? width : length;
  const ax = facing === "x" ? spec.x + length * 0.08 : spec.x + w / 2;
  const ay = facing === "x" ? spec.y + d / 2 : spec.y + length * 0.08;
  const whip = length * 1.7;
  return { scale, facing, length, width, height, w, d, x: spec.x, y: spec.y, z: spec.z, ax, ay, whip };
}

export function antennaPoint(spec: LoraRadioSpec): Point3 {
  const radio = builtOf(spec);
  return [radio.ax, radio.ay, radio.z + radio.height + radio.whip];
}

/** Case corners, the USB nose, and the antenna tip. Enough for `stepProjection`. */
export function loraRadioBounds(spec: LoraRadioSpec): Point3[] {
  const radio = builtOf(spec);
  const z1 = radio.z + radio.height + radio.whip;
  const nose: Point3 = radio.facing === "x" ? [radio.x + radio.w + 4, radio.y, radio.z] : [radio.x, radio.y + radio.d + 4, radio.z];
  const tail: Point3 = radio.facing === "x" ? [radio.x - 4, radio.y + radio.d, z1] : [radio.x + radio.w, radio.y - 4, z1];
  return [
    [radio.x, radio.y, radio.z],
    [radio.x + radio.w, radio.y + radio.d, radio.z],
    nose,
    tail,
    antennaPoint(spec),
  ];
}

/**
 * One Meshtastic node: rounded case, OLED, user button, status LED, USB-C on the far short end,
 * SMA nut and rubber-duck whip on the near short end.
 */
export function loraRadio(spec: LoraRadioSpec, projection: Projection): LoraRadioParts {
  const radio = builtOf(spec);
  const { scale, facing, x, y, z, w, d, height, length, width, ax, ay } = radio;
  const foot: Plan = { x, y, w, d, r: 3.2 * scale };
  const winL = length * 0.4;
  const winW = width * 0.48;
  const win: Plan =
    facing === "x"
      ? { x: x + length * 0.3, y: y + (d - winW) / 2, w: winL, d: winW, r: 0.8 * scale }
      : { x: x + (w - winW) / 2, y: y + length * 0.3, w: winW, d: winL, r: 0.8 * scale };
  const buttonAt: [number, number] = facing === "x" ? [x + length * 0.84, y + d * 0.7] : [x + w * 0.7, y + length * 0.84];
  const ledAt: [number, number] = facing === "x" ? [x + length * 0.32, y + d * 0.2] : [x + w * 0.22, y + length * 0.32];
  const usbSpan = Math.max(4.4, width * 0.42);
  const usbTall = Math.max(2.2, height * 0.36);
  const usbDeep = Math.max(2.2, 2.6 * scale);
  const usb: Plan =
    facing === "x"
      ? { x: x + w - 0.25, y: y + (d - usbSpan) / 2, w: usbDeep, d: usbSpan, r: usbTall * 0.45 }
      : { x: x + (w - usbSpan) / 2, y: y + d - 0.25, w: usbSpan, d: usbDeep, r: usbTall * 0.45 };
  const usbCenter: Point3 =
    facing === "x"
      ? [x + w + usbDeep * 0.85, y + d / 2, z + height / 2]
      : [x + w / 2, y + d + usbDeep * 0.85, z + height / 2];
  const bossDeep = Math.max(1.4, 2 * scale);
  const bossR = width * 0.14;
  const boss: Plan =
    facing === "x"
      ? { x: x - bossDeep + 0.3, y: y + (d - bossR * 2) / 2, w: bossDeep, d: bossR * 2, r: bossR * 0.45 }
      : { x: x + (w - bossR * 2) / 2, y: y - bossDeep + 0.3, w: bossR * 2, d: bossDeep, r: bossR * 0.45 };
  // shortcut: nut and whip radii floor so a half-scale node still reads; drop the floor under scale 0.4
  const nutR = Math.max(1.35, 1.5 * scale);
  const whipR = Math.max(0.62, 0.5 * scale);
  const sleeveR = Math.max(1.15, 1.2 * scale);
  const sleeveH = radio.whip * 0.2;
  const top = z + height;

  return {
    body: slabOf(foot, z, height, projection, 5, 0.7 * scale),
    seam: sideSeam(foot, z + height * 0.62, projection),
    window: slabOf(win, top, 0.55 * Math.max(scale, 0.45), projection, 4, 0),
    windowRim: planOutline(win, top + 0.55 * Math.max(scale, 0.45), projection, 4),
    button: cylinder(buttonAt[0], buttonAt[1], Math.max(1.15, 1.7 * scale), top, Math.max(0.9, 1.3 * scale), projection, 12, 0),
    led: cylinder(ledAt[0], ledAt[1], Math.max(0.7, 0.95 * scale), top, 0.7 * Math.max(scale, 0.5), projection, 10, 0),
    usb: slabOf(usb, z + (height - usbTall) / 2, usbTall, projection, 4, 0),
    usbMouth: sideRing(usbCenter, Math.min(usbTall, usbSpan) * 0.28, facing === "x" ? "x" : "y", projection, 14),
    boss: slabOf(boss, z + height / 2 - bossR, bossR * 2, projection, 4, 0),
    sma: cylinder(ax, ay, nutR, top, Math.max(1.6, 2.2 * scale), projection, 12, 0),
    sleeve: cylinder(ax, ay, sleeveR, top + Math.max(1.6, 2.2 * scale), sleeveH, projection, 10, 0),
    whip: cylinder(ax, ay, whipR, top + Math.max(1.6, 2.2 * scale), radio.whip - Math.max(1.6, 2.2 * scale), projection, 8, 0),
    antennaTip: iso(antennaPoint(spec), projection),
    screen: topMatrix([win.x + 0.8 * scale, win.y + 0.6 * scale], top + 0.6, projection, facing),
    glyph: Math.min(winL / 4.4, winW * 0.55),
    usbAt: iso(usbCenter, projection),
    ledAt: iso([ledAt[0], ledAt[1], top + 0.8], projection),
    footprint: foot,
  };
}
