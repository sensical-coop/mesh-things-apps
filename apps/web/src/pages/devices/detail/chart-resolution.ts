// Mirrors the real backend's readings aggregation (meshtastic-things:
// common/influx_query.py ALLOWED_AGG = {mean, max, min, last, first, sum,
// count}) — only the three most useful for a value chart are exposed here.
export type ChartAgg = "mean" | "min" | "max";

export const CHART_AGG_OPTIONS: { value: ChartAgg; messageId: string; label: string }[] = [
  { value: "mean", messageId: "page.devices.detail.chartResolution.aggMean", label: "Mean" },
  { value: "min", messageId: "page.devices.detail.chartResolution.aggMin", label: "Min" },
  { value: "max", messageId: "page.devices.detail.chartResolution.aggMax", label: "Max" },
];

export type ResolutionOption = { value: string; messageId: string; label: string; ms: number };

// `window` is InfluxDB's `every:` duration for aggregateWindow — the backend
// accepts ms/s/m/h/d/w/mo/y and enforces no minimum or bucket-count cap, so
// these bounds (MIN/MAX_POINTS below) are purely a client-side guardrail
// against asking for more points than a browser chart can usefully render.
const RESOLUTION_LADDER: ResolutionOption[] = [
  { value: "1m", messageId: "page.devices.detail.chartResolution.window1m", label: "1 minute", ms: 60_000 },
  { value: "5m", messageId: "page.devices.detail.chartResolution.window5m", label: "5 minutes", ms: 300_000 },
  { value: "15m", messageId: "page.devices.detail.chartResolution.window15m", label: "15 minutes", ms: 900_000 },
  { value: "30m", messageId: "page.devices.detail.chartResolution.window30m", label: "30 minutes", ms: 1_800_000 },
  { value: "1h", messageId: "page.devices.detail.chartResolution.window1h", label: "1 hour", ms: 3_600_000 },
  { value: "3h", messageId: "page.devices.detail.chartResolution.window3h", label: "3 hours", ms: 10_800_000 },
  { value: "6h", messageId: "page.devices.detail.chartResolution.window6h", label: "6 hours", ms: 21_600_000 },
  { value: "12h", messageId: "page.devices.detail.chartResolution.window12h", label: "12 hours", ms: 43_200_000 },
  { value: "1d", messageId: "page.devices.detail.chartResolution.window1d", label: "1 day", ms: 86_400_000 },
];

const MIN_POINTS = 3;
const MAX_POINTS = 1500;

export function availableResolutions(spanMs: number): ResolutionOption[] {
  return RESOLUTION_LADDER.filter((option) => {
    const points = spanMs / option.ms;
    return points >= MIN_POINTS && points <= MAX_POINTS;
  });
}
