"use client";

import { DEFAULT_ECHARTS_RENDERER, type EChartsRenderer } from "@mtt/ui/components/evilcharts/ui/echarts-chart";
import { GraphChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { useEffect, useRef, type ReactElement } from "react";
import { cn } from "@mtt/ui/utils";

echarts.use([GraphChart, TooltipComponent]);

export type GraphChartNode = {
  id: string;
  label: string;
  /** Drawn larger, e.g. a gateway. */
  emphasis?: boolean;
  /** Drawn faded, e.g. a node only known from someone else's report. */
  muted?: boolean;
};

export type GraphChartEdge = {
  source: string;
  target: string;
  /** 0 to 1: line width and opacity follow it. */
  strength: number;
};

/** A force-directed graph of nodes and weighted edges, in one colour. */
export function EChartsGraphChart({
  nodes,
  edges,
  color,
  className,
  renderer = DEFAULT_ECHARTS_RENDERER,
  onNodeClick,
}: {
  nodes: GraphChartNode[];
  edges: GraphChartEdge[];
  /** A concrete CSS colour; canvas rendering cannot resolve variables. */
  color: string;
  className?: string;
  renderer?: EChartsRenderer;
  onNodeClick?: (id: string) => void;
}): ReactElement {
  const mountRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const clickRef = useRef(onNodeClick);
  clickRef.current = onNodeClick;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const chart = echarts.init(mount, null, { renderer });
    chartRef.current = chart;
    chart.on("click", (params) => {
      if (params.dataType === "node") clickRef.current?.(String((params.data as { id: string }).id));
    });
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(mount);
    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [renderer]);

  useEffect(() => {
    // The force layout spreads to a fixed scale, so a narrow chart starts zoomed out to fit it.
    const zoom = Math.min(1, Math.max(0.35, (mountRef.current?.clientWidth ?? 900) / 900));
    chartRef.current?.setOption(
      {
        animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        tooltip: { formatter: (params: { dataType?: string; data: { label?: string } }) => params.data.label ?? "" },
        series: [
          {
            type: "graph",
            layout: "force",
            roam: true,
            zoom,
            scaleLimit: { min: 0.2, max: 5 },
            draggable: true,
            force: { repulsion: 120, edgeLength: [30, 90], gravity: 0.08 },
            data: nodes.map((node) => ({
              id: node.id,
              name: node.id,
              label: node.label,
              symbolSize: node.emphasis ? 14 : 8,
              itemStyle: { color, opacity: node.muted ? 0.35 : 1 },
            })),
            links: edges.map((edge) => ({
              source: edge.source,
              target: edge.target,
              lineStyle: { color, width: 1 + edge.strength * 3, opacity: 0.25 + edge.strength * 0.65 },
            })),
            emphasis: { focus: "adjacency" },
          },
        ],
      },
      { notMerge: true },
    );
  }, [nodes, edges, color]);

  return <div ref={mountRef} className={cn("h-full w-full", className)} />;
}
