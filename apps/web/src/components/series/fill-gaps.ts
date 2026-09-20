export type TimedValue = { time: string; value: number | null };

const WINDOW_PATTERN = /^(\d+)(s|m|h|d)$/;
const UNIT_MS = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

export function parseWindowMs(window: string): number | null {
  const match = WINDOW_PATTERN.exec(window);
  if (!match) return null;
  const amount = match[1];
  const unit = match[2] as keyof typeof UNIT_MS | undefined;
  if (!amount || !unit) return null;
  return Number(amount) * UNIT_MS[unit];
}

// Caps how many synthetic points a single gap can insert, so a bad/huge window
// guess can't blow up the chart's data array.
const MAX_FILLED_GAP_POINTS = 500;

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const midValue = sorted[mid];
  if (midValue === undefined) return null;
  if (sorted.length % 2 === 0 && mid > 0) {
    const lower = sorted[mid - 1] ?? midValue;
    return (lower + midValue) / 2;
  }
  return midValue;
}

export function fillTimeGaps(points: TimedValue[], stepMs: number | null): TimedValue[] {
  const first = points[0];
  if (points.length < 2 || !first) return points;

  const deltas: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    if (!prev || !cur) continue;
    const delta = Date.parse(cur.time) - Date.parse(prev.time);
    if (Number.isFinite(delta) && delta > 0) deltas.push(delta);
  }
  const typicalStep = median(deltas);
  const referenceStep = stepMs ? Math.max(typicalStep ?? 0, stepMs) : typicalStep;
  if (!referenceStep) return points;

  const result: TimedValue[] = [first];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const next = points[i];
    if (!prev || !next) continue;
    const prevMs = Date.parse(prev.time);
    const nextMs = Date.parse(next.time);
    const gap = nextMs - prevMs;
    if (Number.isFinite(prevMs) && Number.isFinite(nextMs) && gap > referenceStep * 1.5) {
      const bucketCount = Math.min(Math.round(gap / referenceStep) - 1, MAX_FILLED_GAP_POINTS);
      for (let b = 1; b <= bucketCount; b++) {
        result.push({ time: new Date(prevMs + b * referenceStep).toISOString(), value: null });
      }
    }
    result.push(next);
  }
  return result;
}
