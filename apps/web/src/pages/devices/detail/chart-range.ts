import { spanMs } from "../../../lib/duration.ts";

export type DeviceChartRange =
  | { kind: "preset"; start: string; spanMs: number }
  | { kind: "custom"; label: string; start: string; stop: string; spanMs: number };

export const CHART_RANGE_PRESETS = [
  {
    label: "Last 24 hours",
    messageId: "page.devices.detail.chartRange.last24h",
    start: "-24h",
    spanMs: spanMs("24h"),
  },
  {
    label: "Last 7 days",
    messageId: "page.devices.detail.chartRange.last7d",
    start: "-7d",
    spanMs: spanMs("7d"),
  },
  {
    label: "Last 30 days",
    messageId: "page.devices.detail.chartRange.last30d",
    start: "-30d",
    spanMs: spanMs("30d"),
  },
] as const;

export function presetRange(preset: (typeof CHART_RANGE_PRESETS)[number]): DeviceChartRange {
  return { kind: "preset", start: preset.start, spanMs: preset.spanMs };
}

export function defaultChartRange(): DeviceChartRange {
  return presetRange(CHART_RANGE_PRESETS[0]);
}

export function chartRangeQuery(range: DeviceChartRange): {
  start: string;
  stop?: string;
} {
  if (range.kind === "preset") {
    return { start: range.start };
  }
  return { start: range.start, stop: range.stop };
}

// Same "1h" default up to 2 days, "6h" up to 14, else "1d" the range picker used
// to bake into each preset — now the starting point for the resolution picker,
// which the user may then widen or narrow.
export function windowForSpanMs(span: number): string {
  const days = span / spanMs("1d");
  if (days <= 2) return "1h";
  if (days <= 14) return "6h";
  return "1d";
}

function formatCustomRangeLabel(start: Date, end: Date, locale?: string): string {
  const sameDay = start.toDateString() === end.toDateString();
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
  const endFmt = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (sameDay) return endFmt.format(start);
  return `${startFmt.format(start)} – ${endFmt.format(end)}`;
}

export function customRangeFromDates(from: Date, to: Date, locale?: string): DeviceChartRange {
  const start = from.getTime() <= to.getTime() ? from : to;
  const end = from.getTime() <= to.getTime() ? to : from;
  return {
    kind: "custom",
    label: formatCustomRangeLabel(start, end, locale),
    start: start.toISOString(),
    stop: end.toISOString(),
    spanMs: Math.max(end.getTime() - start.getTime(), 0),
  };
}

export function customRangeSelection(range: DeviceChartRange): { from: Date; to: Date } | undefined {
  if (range.kind !== "custom") return undefined;
  return { from: new Date(range.start), to: new Date(range.stop) };
}
