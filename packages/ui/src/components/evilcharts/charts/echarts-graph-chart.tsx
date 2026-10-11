"use client";

import { DEFAULT_ECHARTS_RENDERER, type EChartsRenderer } from "@mtt/ui/components/evilcharts/ui/echarts-chart";
import { GraphChart } from "echarts/charts";
import * as echarts from "echarts/core";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { cn } from "@mtt/ui/utils";

echarts.use([GraphChart]);

const SERIES_ID = "graph";
// A grey edge keeps a pale colour visible on light and dark backgrounds alike.
const OUTLINE = "rgba(128, 128, 128, 0.7)";

export type GraphChartNode = {
  id: string;
  label: string;
  /** Drawn larger and in `emphasisColor`, e.g. a gateway. */
  emphasis?: boolean;
  /** Drawn faded, e.g. a node only known from someone else's report. */
  muted?: boolean;
  /** Ringed in `highlightColor`, e.g. a hop on a selected route. */
  highlight?: boolean;
};

export type GraphChartEdge = {
  source: string;
  target: string;
  /** 0 to 1: line width and opacity follow it. */
  strength: number;
  /** Drawn thick, on top, in `highlightColor`. */
  highlight?: boolean;
};

/** A force-directed graph of nodes and weighted edges, with emphasised nodes and a highlighted path in their own colours. */
export function EChartsGraphChart({
  nodes,
  edges,
  color,
  emphasisColor = color,
  highlightColor = emphasisColor,
  className,
  renderer = DEFAULT_ECHARTS_RENDERER,
  onNodeClick,
}: {
  nodes: GraphChartNode[];
  edges: GraphChartEdge[];
  /** A concrete CSS colour; canvas rendering cannot resolve variables. */
  color: string;
  /** A concrete CSS colour for emphasised nodes. Defaults to `color`. */
  emphasisColor?: string;
  /** A concrete CSS colour for highlighted nodes and edges. Defaults to `emphasisColor`. */
  highlightColor?: string;
  className?: string;
  renderer?: EChartsRenderer;
  onNodeClick?: (id: string) => void;
}): ReactElement {
  const mountRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const clickRef = useRef(onNodeClick);
  clickRef.current = onNodeClick;
  // Hover labels are drawn on the canvas, so they need the theme's text colour as a value.
  const [labelColor, setLabelColor] = useState<string>();
  const labelColorRef = useRef(labelColor);
  labelColorRef.current = labelColor;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const chart = echarts.init(mount, null, { renderer });
    chartRef.current = chart;
    // The force layout spreads to a fixed scale, so a narrow chart starts zoomed out to fit it.
    chart.setOption({ series: [{ id: SERIES_ID, type: "graph", zoom: Math.min(1, Math.max(0.35, mount.clientWidth / 900)) }] });
    chart.on("click", (params) => {
      if (params.dataType === "node") clickRef.current?.((params.data as { id: string }).id);
    });
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(mount);
    const readLabelColor = () => {
      const probe = document.createElement("span");
      probe.className = "text-foreground";
      mount.appendChild(probe);
      setLabelColor(getComputedStyle(probe).color);
      probe.remove();
    };
    readLabelColor();
    const themeObserver = new MutationObserver(readLabelColor);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      themeObserver.disconnect();
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [renderer]);

  useEffect(() => {
    // Merged rather than replaced: the series keeps its node positions and zoom, so
    // selecting a route or a new range does not reshuffle the graph.
    chartRef.current?.setOption(
      {
        animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        series: [
          {
            id: SERIES_ID,
            type: "graph",
            layout: "force",
            roam: true,
            scaleLimit: { min: 0.2, max: 5 },
            draggable: true,
            force: { repulsion: 120, edgeLength: [30, 90], gravity: 0.08 },
            data: nodes.map((node) => ({
              id: node.id,
              name: node.label,
              symbolSize: node.emphasis ? 14 : 8,
              itemStyle: {
                color: node.emphasis ? emphasisColor : color,
                borderColor: node.highlight ? highlightColor : node.emphasis ? OUTLINE : undefined,
                borderWidth: node.highlight ? 3 : node.emphasis ? 1 : 0,
                opacity: node.muted && !node.highlight ? 0.35 : 1,
              },
            })),
            // Edges are drawn in order, so highlighted ones go last to sit on top.
            links: [...edges.filter((edge) => !edge.highlight), ...edges.filter((edge) => edge.highlight)].map((edge) => ({
              source: edge.source,
              target: edge.target,
              lineStyle: edge.highlight
                ? { color: highlightColor, width: 4, opacity: 1 }
                : { color, width: 1 + edge.strength * 3, opacity: 0.25 + edge.strength * 0.65 },
            })),
            emphasis: { focus: "adjacency", label: { show: true, color: labelColorRef.current, textBorderWidth: 0 } },
          },
        ],
      },
    );
  }, [nodes, edges, color, emphasisColor, highlightColor]);

  // A theme flip only recolours the labels, without restarting the layout.
  useEffect(() => {
    chartRef.current?.setOption({ series: [{ id: SERIES_ID, emphasis: { label: { color: labelColor } } }] });
  }, [labelColor]);

  return <div ref={mountRef} className={cn("h-full w-full", className)} />;
}
