import { EChartsAreaChart, type ChartConfig } from "@mtt/ui/components/evilcharts/charts/echarts-area-chart";
import { type ReactElement } from "react";
import type { Point } from "@mtt/contracts";
import { asNumber, formatClock, formatWhen } from "@/lib/format";
import { StatusCopy } from "@/components/status-copy";
import { fillTimeGaps } from "@/components/series/fill-gaps";

// A computed channel takes the purple of its "Computed" chip; the token follows the theme.
const COMPUTED_COLOR = "var(--color-status-purple-text)";

function seriesConfig(label: string, computed: boolean): ChartConfig {
  const color = computed ? COMPUTED_COLOR : "var(--oa-primary)";
  return {
    value: {
      label,
      colors: { light: [color], dark: [color] },
    },
  };
}

export function SeriesPlot({
  points,
  seriesLabel,
  windowMs,
  computed = false,
}: {
  points: Point[];
  seriesLabel: string;
  windowMs?: number | null;
  /** A channel a blueprint derives: drawn in the purple of the "Computed" chip. */
  computed?: boolean;
}): ReactElement {
  // Keep null-valued buckets (missing data within the aggregation window) instead
  // of dropping them, and reinsert buckets the API omitted entirely: the chart's
  // x-axis spaces points by array index, so either one collapses real time gaps
  // down to zero width.
  const raw = points.map((p) => ({ time: p.time, value: asNumber(p.value) }));
  const data = fillTimeGaps(raw, windowMs ?? null);
  const numericCount = data.reduce((n, row) => n + (row.value === null ? 0 : 1), 0);
  if (numericCount < 2) {
    return <StatusCopy>Need at least two numeric points to draw this channel.</StatusCopy>;
  }

  return (
    <EChartsAreaChart
      data={data}
      config={seriesConfig(seriesLabel, computed)}
      xDataKey="time"
      className="h-52 w-full"
      curveType="monotone"
      animation={false}
    >
      <EChartsAreaChart.Grid />
      <EChartsAreaChart.XAxis dataKey="time" tickFormatter={(value) => formatClock(value)} />
      <EChartsAreaChart.YAxis />
      <EChartsAreaChart.Tooltip labelFormatter={(value) => formatWhen(value)} />
      <EChartsAreaChart.Legend align="left" variant="horizontal-bar" />
      <EChartsAreaChart.Area dataKey="value" variant="gradient" strokeVariant="solid" strokeWidth={2}>
        <EChartsAreaChart.ActiveDot variant="colored-border" />
      </EChartsAreaChart.Area>
    </EChartsAreaChart>
  );
}
