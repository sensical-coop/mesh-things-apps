export type DeviceChartRange =
  | { kind: "preset"; label: string; start: string; window: string }
  | { kind: "custom"; label: string; start: string; stop: string; window: string };

export const CHART_RANGE_PRESETS = [
  {
    label: "Last 24 hours",
    messageId: "page.devices.detail.chartRange.last24h",
    start: "-24h",
    window: "1h",
  },
  {
    label: "Last 7 days",
    messageId: "page.devices.detail.chartRange.last7d",
    start: "-7d",
    window: "6h",
  },
  {
    label: "Last 30 days",
    messageId: "page.devices.detail.chartRange.last30d",
    start: "-30d",
    window: "1d",
  },
] as const;

export function defaultChartRange(): DeviceChartRange {
  const preset = CHART_RANGE_PRESETS[0];
  return { kind: "preset", label: preset.label, start: preset.start, window: preset.window };
}

export function chartRangeQuery(range: DeviceChartRange): {
  start: string;
  window: string;
  stop?: string;
} {
  if (range.kind === "preset") {
    return { start: range.start, window: range.window };
  }
  return { start: range.start, stop: range.stop, window: range.window };
}

function windowForSpanMs(spanMs: number): string {
  const days = spanMs / 86_400_000;
  if (days <= 2) return "1h";
  if (days <= 14) return "6h";
  return "1d";
}

export function formatCustomRangeLabel(start: Date, end: Date, locale?: string): string {
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
    window: windowForSpanMs(Math.max(end.getTime() - start.getTime(), 0)),
  };
}

export function customRangeSelection(range: DeviceChartRange): { from: Date; to: Date } | undefined {
  if (range.kind !== "custom") return undefined;
  return { from: new Date(range.start), to: new Date(range.stop) };
}
