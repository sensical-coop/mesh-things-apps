import type { DeviceRead, MeshRelay } from "@mtt/contracts";
import { EChartsGraphChart } from "@mtt/ui/components/evilcharts/charts/echarts-graph-chart";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { cx } from "@mtt/ui/utils/cx";
import { RiCollapseDiagonalLine, RiExpandDiagonalLine, RiMapLine, RiShareLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useNavigate } from "@tanstack/react-router";
import { expandedMapClass } from "@/lib/expanded-map";
import { routes } from "@/router";
import { type ReactElement, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { deviceTitle } from "@/features/device/model";
import { meshRepository } from "@/features/mesh/repository";
import {
  LINK_WINDOWS,
  MESH_REFRESH_MS,
  type MeshStatsRange,
  hullAreaKm2,
  linkGraph,
  nodeHex,
  nodePositions,
  pairLinks,
  routeCoordinates,
  snrStrength,
} from "../model";
import { tokenColor } from "../token-color";
import { LinksMap } from "./links-map";
import { RankedBars, type RankedBar } from "./ranked-bars";
import { RelaysFrame } from "./relays-frame";
import { TraceroutePanel } from "./traceroute-panel";

const TRACEROUTE_PAGE = 20;
const LONGEST_LINKS = 10;

export function TopologySection({
  meshId,
  range,
  devices,
  relays,
}: {
  meshId: string;
  range: MeshStatsRange;
  devices: DeviceRead[];
  relays: MeshRelay[];
}): ReactElement {
  const { formatMessage, formatNumber } = useIntl();
  const navigate = useNavigate();
  const [mapSize, setMapSize] = useQueryState("map", parseAsStringLiteral(["large"]));
  const [linkView, setLinkView] = useQueryState("links", parseAsStringLiteral(["graph"]));
  const large = mapSize === "large";
  const graph = linkView === "graph";
  const [traceLimit, setTraceLimit] = useState(TRACEROUTE_PAGE);
  const [selected, setSelected] = useState<number | null>(null);
  const links = useQuery({
    ...meshRepository.links(meshId, { since: LINK_WINDOWS[range] }),
    refetchInterval: MESH_REFRESH_MS,
  });
  const traceroutes = useQuery({
    ...meshRepository.traceroutes(meshId, { limit: traceLimit }),
    refetchInterval: MESH_REFRESH_MS,
  });

  const byNode = useMemo(() => new Map(devices.map((d) => [d.node_id, d])), [devices]);
  const positions = useMemo(() => nodePositions(devices), [devices]);
  const pairs = useMemo(() => pairLinks(links.data ?? []), [links.data]);
  const nodeName = (node: number) => {
    const device = byNode.get(node);
    return device ? deviceTitle(device) : nodeHex(node);
  };
  const chosen = traceroutes.data?.find((t) => t.id === selected) ?? null;
  const route = chosen ? routeCoordinates(chosen.towards, positions) : null;
  const drawn = pairs.filter((pair) => positions.has(pair.a) && positions.has(pair.b)).length;
  const area = hullAreaKm2([...positions.values()]);
  const graphData = useMemo(() => {
    const { nodes, edges } = linkGraph(pairs, chosen?.towards ?? []);
    return {
      nodes: nodes.map(({ node, onRoute }) => ({
        id: String(node),
        label: byNode.has(node) ? deviceTitle(byNode.get(node)!) : nodeHex(node),
        emphasis: byNode.get(node)?.is_gateway ?? false,
        muted: !byNode.has(node),
        highlight: onRoute,
      })),
      edges: edges.map((edge) => ({
        source: String(edge.a),
        target: String(edge.b),
        strength: edge.snr == null ? 0 : snrStrength(edge.snr),
        highlight: edge.onRoute,
      })),
    };
  }, [pairs, byNode, chosen]);
  const snr = (value: number) => formatNumber(value, { maximumFractionDigits: 1 });

  const longest: RankedBar[] = pairs
    .filter((pair) => pair.distanceKm != null)
    .slice(0, LONGEST_LINKS)
    .map((pair) => ({
      key: pair.key,
      label: `${nodeName(pair.a)} ↔ ${nodeName(pair.b)}`,
      value: pair.distanceKm!,
      display: formatMessage(
        { id: "page.meshes.detail.network.links.distanceSnr", defaultMessage: "{km} km · {snr} dB" },
        { km: formatNumber(pair.distanceKm!, { maximumFractionDigits: 1 }), snr: snr(pair.snr) },
      ),
    }));

  const traceroutePanel = (
    <TraceroutePanel
      traceroutes={traceroutes}
      limit={traceLimit}
      onMore={() => setTraceLimit((n) => n + TRACEROUTE_PAGE)}
      selected={selected}
      onSelect={(id) => setSelected((current) => (current === id ? null : id))}
      route={chosen && route && !graph ? { shown: route.length, total: chosen.towards.length } : null}
      nodeName={nodeName}
      snr={snr}
    />
  );
  const graphView = (
    <div className={cx("oa-arrive overflow-hidden oa-squircle-inset bg-background-primary-default", large ? expandedMapClass : "h-96")}>
      <EChartsGraphChart
        nodes={graphData.nodes}
        edges={graphData.edges}
        color={tokenColor("--oa-primary", "#ff495f")}
        emphasisColor={tokenColor("--color-gateway", "#a5f3fc")}
        highlightColor={tokenColor("--color-route-selected", "#06b6d4")}
        onNodeClick={(id) => {
          const device = byNode.get(Number(id));
          if (device) void navigate({ to: routes.device, params: { deviceUuid: device.uuid } });
        }}
      />
    </div>
  );
  const tracerouteTitle = formatMessage({
    id: "page.meshes.detail.network.traceroutes.title",
    defaultMessage: "Traceroutes",
  });

  return (
    <>
      <Frame className="shadow-card">
        <FrameHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <FrameTitle>
                {formatMessage({ id: "page.meshes.detail.network.links.title", defaultMessage: "Radio links" })}
              </FrameTitle>
              <FrameDescription>
                {formatMessage(
                  {
                    id: "page.meshes.detail.network.links.coverage",
                    defaultMessage:
                      "{pairs,plural,one{{drawn} of # link drawn. A link needs both nodes to report position ({positioned} of {devices} registered nodes have one).} other{{drawn} of # links drawn. A link needs both nodes to report position ({positioned} of {devices} registered nodes have one).}}",
                  },
                  { drawn, pairs: pairs.length, positioned: positions.size, devices: devices.length },
                )}
                {area != null
                  ? ` ${formatMessage(
                      {
                        id: "page.meshes.detail.network.links.area",
                        defaultMessage: "Positioned nodes span about {area} km².",
                      },
                      { area: formatNumber(area, { maximumFractionDigits: area < 10 ? 1 : 0 }) },
                    )}`
                  : null}
              </FrameDescription>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            {pairs.length ? (
              <Button
                type="button"
                size="small"
                variant="secondary"
                leadingIcon={graph ? RiMapLine : RiShareLine}
                onClick={() => void setLinkView(graph ? null : "graph")}
              >
                {graph
                  ? formatMessage({ id: "page.meshes.detail.network.links.showMap", defaultMessage: "Map" })
                  : formatMessage({ id: "page.meshes.detail.network.links.showGraph", defaultMessage: "Graph" })}
              </Button>
            ) : null}
            {positions.size || graph ? (
              <Button
                type="button"
                size="small"
                variant="secondary"
                leadingIcon={large ? RiCollapseDiagonalLine : RiExpandDiagonalLine}
                onClick={() => void setMapSize(large ? null : "large")}
              >
                {large
                  ? formatMessage({ id: "page.meshes.detail.network.links.smaller", defaultMessage: "Smaller view" })
                  : formatMessage({ id: "page.meshes.detail.network.links.larger", defaultMessage: "Larger view" })}
              </Button>
            ) : null}
            </div>
          </div>
        </FrameHeader>
        <FramePanel>
          {links.isPending ? <SkeletonRows rows={2} /> : null}
          {links.data && (positions.size || graph) ? (
            large ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                {graph ? graphView : <LinksMap pairs={pairs} positions={positions} devices={devices} route={route} large />}
                <section className="flex min-h-0 min-w-0 flex-col gap-2 lg:h-[70svh]" aria-label={tracerouteTitle}>
                  <h3 className="text-body-medium text-text-primary">{tracerouteTitle}</h3>
                  <div className="min-h-0 flex-1 overflow-y-auto pe-1">{traceroutePanel}</div>
                </section>
              </div>
            ) : graph ? (
              graphView
            ) : (
              <LinksMap pairs={pairs} positions={positions} devices={devices} route={route} />
            )
          ) : null}
          {links.data && !positions.size && !graph ? (
            <StatusCopy>
              {pairs.length
                ? formatMessage({
                    id: "page.meshes.detail.network.links.noPositions",
                    defaultMessage: "Links are drawn once both of their nodes have a position.",
                  })
                : formatMessage({
                    id: "page.meshes.detail.network.links.none",
                    defaultMessage: "No radio links heard in this range yet.",
                  })}
            </StatusCopy>
          ) : null}
        </FramePanel>
      </Frame>
      <div className={cx("grid gap-6", !large && "lg:grid-cols-2")}>
        <Frame className="shadow-card">
          <FrameHeader>
            <FrameTitle>
              {formatMessage({ id: "page.meshes.detail.network.longest.title", defaultMessage: "Longest links" })}
            </FrameTitle>
            <FrameDescription>
              {formatMessage({
                id: "page.meshes.detail.network.longest.description",
                defaultMessage: "Distance between nodes that heard each other, and their best SNR.",
              })}
            </FrameDescription>
          </FrameHeader>
          <FramePanel>
            {longest.length ? (
              <RankedBars
                rows={longest}
                label={formatMessage({ id: "page.meshes.detail.network.longest.title", defaultMessage: "Longest links" })}
              />
            ) : (
              <StatusCopy>
                {formatMessage({
                  id: "page.meshes.detail.network.links.noPositions",
                  defaultMessage: "Links are drawn once both of their nodes have a position.",
                })}
              </StatusCopy>
            )}
          </FramePanel>
        </Frame>
        {large ? null : (
          <Frame className="shadow-card">
            <FrameHeader>
              <FrameTitle>{tracerouteTitle}</FrameTitle>
              <FrameDescription>
                {formatMessage({
                  id: "page.meshes.detail.network.traceroutes.description",
                  defaultMessage: "Select one to draw its route on the map or graph.",
                })}
              </FrameDescription>
            </FrameHeader>
            <FramePanel>{traceroutePanel}</FramePanel>
          </Frame>
        )}
      </div>
      <RelaysFrame relays={relays} links={links.data ?? []} nodeName={nodeName} byNode={byNode} />
    </>
  );
}