/** Figure time is 60× wall time so a 30 min interval is readable. */
export const PUBLISH_INTERVAL_SECONDS = 1800;
export const TIME_SCALE = 60;
export const INTERVAL = PUBLISH_INTERVAL_SECONDS / TIME_SCALE;
export const MISSED_TO_TRIP = 3;
export const TRIP = INTERVAL * MISSED_TO_TRIP;
export const TOUR = 36;
export const MISS_FROM = 9;
export const MISS_TO = 27;

export interface Bench {
  age: number;
  held: boolean;
  trip: boolean;
}

const TRIP_HOLD = 4;

/** Miss window runs the dial from one interval out to the email trip, then holds it. */
export function tourAge(clock: number): number {
  const t = clock % TOUR;
  if (t < MISS_FROM) return t % INTERVAL;
  if (t < MISS_TO) {
    const climb = MISS_TO - MISS_FROM - TRIP_HOLD;
    const into = t - MISS_FROM;
    if (into >= climb) return TRIP;
    return INTERVAL + (into / climb) * (TRIP - INTERVAL);
  }
  return (t - MISS_TO) % INTERVAL;
}

export function benchOf(age: number, held: boolean): Bench {
  // The needle eases onto the stop, so the flag drops once it is on the red tick.
  return { age: Math.min(age, TRIP), held, trip: age >= TRIP - 0.5 };
}

export function seenSeconds(age: number): number {
  return Math.round(age * TIME_SCALE);
}
