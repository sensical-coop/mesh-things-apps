/** Panel gauge in degrees Celsius. The blueprint channel is the same reading in Fahrenheit. */
export const SCALE_LO = 0;
export const SCALE_HI = 40;
export const RANGE_MIN = 12;
export const RANGE_MAX = 28;
export const REST_READING = 20;
export const STEP = 1;
export const BIG_STEP = 5;
export const GAP = 2;

export const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export function placeReading(value: number) {
  return clamp(Math.round(value * 10) / 10, SCALE_LO, SCALE_HI);
}

export function placeMin(value: number, max: number) {
  return clamp(Math.round(value), SCALE_LO, max - GAP);
}

export function placeMax(value: number, min: number) {
  return clamp(Math.round(value), min + GAP, SCALE_HI);
}

export function alarming(reading: number, min: number, max: number) {
  return reading < min || reading > max;
}

/** A blueprint: one new channel from a reading the device already sends. */
export function fahrenheit(celsius: number) {
  return Math.round((celsius * 1.8 + 32) * 10) / 10;
}

export function formatTenths(value: number) {
  return (Math.round(value * 10) / 10).toFixed(1);
}
