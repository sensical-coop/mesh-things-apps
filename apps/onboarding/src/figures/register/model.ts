/** Eight hex wheels. The sample is the real 32-bit value `!a1b2c3d4`. */
export const HEX = "0123456789abcdef";
export const WHEEL_COUNT = 8;
export const SAMPLE = [10, 1, 11, 2, 12, 3, 13, 4] as const;
export const SAMPLE_VALUE = 2712847316;
export const TOUR_LOOP = 8.4;

const PLACE = 16;

export function placeOf(digit: number): number {
  return ((Math.round(digit) % PLACE) + PLACE) % PLACE;
}

export function nodeValue(digits: readonly number[]): number {
  let value = 0;
  for (const digit of digits) value = (value * PLACE + placeOf(digit)) >>> 0;
  return value;
}

export function hexId(digits: readonly number[]): string {
  let text = "!";
  for (const digit of digits) text += HEX.charAt(placeOf(digit));
  return text;
}

/** Meshtastic short name: the last four hex digits of the node ID. */
export function shortName(digits: readonly number[]): string {
  let text = "";
  const start = Math.max(0, digits.length - 4);
  for (let index = start; index < digits.length; index++) text += HEX.charAt(placeOf(digits[index] ?? 0));
  return text;
}

export function readoutOf(digits: readonly number[]): string {
  return `${hexId(digits)} = ${nodeValue(digits)}`;
}

export function glyphOf(digit: number): string {
  return HEX.charAt(placeOf(digit));
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const ease = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

/** Idle tour: the wheels roll to the sample ID, hold, then clear. The screen follows. */
export function tourAt(time: number): number[] {
  const at = time % TOUR_LOOP;
  return SAMPLE.map((target, index) => {
    const rolled = ease((at - 0.2 - index * 0.14) / 1.05);
    if (at < 6.2) return target * rolled;
    return target * (1 - ease((at - 6.2) / 1.15));
  });
}

if (nodeValue(SAMPLE) !== SAMPLE_VALUE || hexId(SAMPLE) !== "!a1b2c3d4" || shortName(SAMPLE) !== "c3d4") {
  throw new Error("register figure: sample node id");
}
