import { EChartsAreaChart, type ChartConfig } from "@mtt/ui/components/evilcharts/charts/echarts-area-chart";
import { type ReactElement } from "react";
import type { Point } from "@mtt/contracts";
import { asNumber, formatClock, formatWhen } from "@/lib/format";
import { StatusCopy } from "@/components/status-copy";
import { fillTimeGaps } from "@/components/series/fill-gaps";

function seriesConfig(label: string): ChartConfig {
  return {
    value: {
      label,
      colors: { light: ["var(--oa-primary)"], dark: ["var(--oa-primary)"] },
    },
  };
}

export function SeriesPlot({
  points,
  seriesLabel,
  windowMs,
}: {
  points: Point[];
  seriesLabel: string;
  windowMs?: number | null;
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
      config={seriesConfig(seriesLabel)}
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
