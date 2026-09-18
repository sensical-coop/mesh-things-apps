import { EChartsAreaChart, type ChartConfig } from "@mtt/ui/components/evilcharts/charts/echarts-area-chart";
import { type ReactElement } from "react";
import type { Point } from "@mtt/contracts";
import { asNumber, formatClock, formatWhen } from "@/lib/format";
import { StatusCopy } from "@/components/status-copy";

function seriesConfig(label: string): ChartConfig {
  return {
    value: {
      label,
      colors: { light: ["var(--oa-primary)"], dark: ["var(--oa-primary)"] },
    },
  };
}

export function SeriesPlot({ points, seriesLabel }: { points: Point[]; seriesLabel: string }): ReactElement {
  const data = points.flatMap((p) => {
    const value = asNumber(p.value);
    return value === null ? [] : [{ time: p.time, value }];
  });
  if (data.length < 2) {
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
