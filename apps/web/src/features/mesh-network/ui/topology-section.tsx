import type { DeviceRead, MeshRelay, RfLink, Traceroute } from "@mtt/contracts";
import { EChartsGraphChart } from "@mtt/ui/components/evilcharts/charts/echarts-graph-chart";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { cx } from "@mtt/ui/utils/cx";
import { RiCollapseDiagonalLine, RiExpandDiagonalLine, RiMapLine, RiShareLine } from "@remixicon/react";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Link, useNavigate } from "@tanstack/react-router";
import { routes } from "@/router";
import { type ReactElement, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { useFormatters } from "@/hooks/use-formatters";
import { deviceTitle } from "@/features/device/model";
import { meshRepository } from "@/features/mesh/repository";
import {
  LINK_WINDOWS,
  type MeshStatsRange,
  confirmedRelays,
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

const REFRESH_MS = 60_000;
const TRACEROUTE_PAGE = 20;
const LONGEST_LINKS = 10;
const MAP_SIZES = ["large"] as const;
const LINK_VIEWS = ["graph"] as const;

/** Who hears whom: the links map, the longest links and the traceroutes heard on the mesh. */
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
  const [mapSize, setMapSize] = useQueryState("map", parseAsStringLiteral(MAP_SIZES));
  const [linkView, setLinkView] = useQueryState("links", parseAsStringLiteral(LINK_VIEWS));
  const large = mapSize === "large";
  const graph = linkView === "graph";
  const [traceLimit, setTraceLimit] = useState(TRACEROUTE_PAGE);
  const [selected, setSelected] = useState<number | null>(null);
  const links = useQuery({
    ...meshRepository.links({ path: { mesh_id: meshId }, query: { since: LINK_WINDOWS[range] } }),
    refetchInterval: REFRESH_MS,
  });
  const traceroutes = useQuery({
    ...meshRepository.traceroutes({ path: { mesh_id: meshId }, query: { limit: traceLimit } }),
    refetchInterval: REFRESH_MS,
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
    <div className={cx("oa-arrive oa-squircle-inset overflow-hidden bg-background-primary-default", large ? "h-[70vh] min-h-96" : "h-96")}>
      <EChartsGraphChart
        nodes={graphData.nodes}
        edges={graphData.edges}
        color={tokenColor("--oa-primary", "#ff495f")}
        emphasisColor={tokenColor("--color-cyan-200", "#a5f3fc")}
        highlightColor={tokenColor("--color-cyan-500", "#06b6d4")}
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
                      "{drawn} of {pairs, plural, one {# link} other {# links}} drawn: a link needs a position on both nodes, and {positioned} of {devices} registered nodes have one. Faded pins have no drawable link. Thicker lines are stronger signals.",
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
                <section className="flex min-h-0 min-w-0 flex-col gap-2 lg:h-[70vh]" aria-label={tracerouteTitle}>
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
                  defaultMessage: "Newest first. Select one to draw its route on the map or graph.",
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

function RelaysFrame({
  relays,
  links,
  nodeName,
  byNode,
}: {
  relays: MeshRelay[];
  links: RfLink[];
  nodeName: (node: number) => string;
  byNode: Map<number, DeviceRead>;
}): ReactElement {
  const { formatMessage, formatNumber } = useIntl();
  const title = formatMessage({ id: "page.meshes.detail.network.relays.title", defaultMessage: "Relays into gateways" });
  const nodeLink = (node: number, strong: boolean) => {
    const device = byNode.get(node);
    const text = nodeName(node);
    return device ? (
      <Link
        to={routes.device}
        params={{ deviceUuid: device.uuid }}
        className={cx("hover:text-accent-500", strong ? "text-text-primary" : "text-text-secondary")}
      >
        {text}
      </Link>
    ) : (
      text
    );
  };
  return (
    <Frame className="shadow-card">
      <FrameHeader>
        <FrameTitle>{title}</FrameTitle>
        <FrameDescription>
          {formatMessage({
            id: "page.meshes.detail.network.relays.description",
            defaultMessage:
              "The node that passed each relayed packet on to a gateway. The firmware reports only the last byte of its number, so each comes with the registered nodes it could be; a gateway that also hears a candidate directly makes it the likely one.",
          })}
        </FrameDescription>
      </FrameHeader>
      <FramePanel>
        {relays.length ? (
          <ul className="oa-arrive flex flex-col" aria-label={title}>
            {relays.map((relay) => {
              const candidates = relay.candidates.map((c) => c.node_id);
              const confirmed = confirmedRelays(candidates, relay.gateway_id, links);
              return (
                <li
                  key={`${relay.gateway_id}-${relay.relay}`}
                  className="flex flex-col gap-0.5 border-t border-separator-border py-2 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-baseline justify-between gap-3 text-body-2-regular">
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span className="min-w-0 truncate">{nodeLink(relay.gateway_id, true)}</span>
                      <span className="shrink-0 text-text-tertiary">←</span>
                      <span className="shrink-0 font-mono text-text-secondary">
                        ··{relay.relay.toString(16).padStart(2, "0")}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-text-secondary">
                      {formatMessage(
                        { id: "page.meshes.detail.network.relays.count", defaultMessage: "{count} receptions" },
                        { count: formatNumber(relay.receptions) },
                      )}
                    </span>
                  </div>
                  <div className="text-caption-1-regular text-text-tertiary">
                    {candidates.length ? (
                      <span className="flex flex-wrap gap-x-2">
                        <span>
                          {formatMessage({ id: "page.meshes.detail.network.relays.candidates", defaultMessage: "Could be" })}
                        </span>
                        {candidates.map((node) => (
                          <span key={node}>
                            {nodeLink(node, confirmed.has(node))}
                            {confirmed.has(node)
                              ? ` ${formatMessage({
                                  id: "page.meshes.detail.network.relays.heardDirectly",
                                  defaultMessage: "(heard directly)",
                                })}`
                              : null}
                          </span>
                        ))}
                      </span>
                    ) : (
                      formatMessage({
                        id: "page.meshes.detail.network.relays.unregistered",
                        defaultMessage: "No registered node",
                      })
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <StatusCopy>
            {formatMessage({
              id: "page.meshes.detail.network.relays.none",
              defaultMessage: "No relayed packets reached a gateway in this range.",
            })}
          </StatusCopy>
        )}
      </FramePanel>
    </Frame>
  );
}

function TraceroutePanel({
  traceroutes,
  limit,
  onMore,
  selected,
  onSelect,
  route,
  nodeName,
  snr,
}: {
  traceroutes: UseQueryResult<Traceroute[]>;
  limit: number;
  onMore: () => void;
  selected: number | null;
  onSelect: (id: number) => void;
  route: { shown: number; total: number } | null;
  nodeName: (node: number) => string;
  snr: (value: number) => string;
}): ReactElement {
  const { formatMessage } = useIntl();
  if (traceroutes.isPending) return <SkeletonRows rows={3} />;
  if (!traceroutes.data?.length) {
    return (
      <StatusCopy>
        {formatMessage({
          id: "page.meshes.detail.network.traceroutes.none",
          defaultMessage: "No traceroutes heard on this mesh in the last 30 days.",
        })}
      </StatusCopy>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {route && route.shown < route.total ? (
        <p className="text-pretty text-caption-1-regular text-text-tertiary">
          {formatMessage(
            {
              id: "page.meshes.detail.network.traceroutes.partialRoute",
              defaultMessage: "Drawn through the {shown} of {total} nodes on this route that have a position.",
            },
            route,
          )}
        </p>
      ) : null}
      <TracerouteList
        traceroutes={traceroutes.data}
        selected={selected}
        onSelect={onSelect}
        nodeName={nodeName}
        snr={snr}
      />
      {traceroutes.data.length >= limit ? (
        <Button type="button" size="small" variant="secondary" className="self-start" onClick={onMore}>
          {formatMessage({ id: "page.meshes.detail.network.traceroutes.more", defaultMessage: "Show older" })}
        </Button>
      ) : null}
    </div>
  );
}

function TracerouteList({
  traceroutes,
  selected,
  onSelect,
  nodeName,
  snr,
}: {
  traceroutes: Traceroute[];
  selected: number | null;
  onSelect: (id: number) => void;
  nodeName: (node: number) => string;
  snr: (value: number) => string;
}): ReactElement {
  const { formatMessage, formatNumber } = useIntl();
  const { formatWhen } = useFormatters();
  return (
    <ul className="oa-arrive flex flex-col gap-1">
      {traceroutes.map((t) => {
        const hops = Math.max(0, t.towards.length - 2);
        const measured = t.snr_towards.filter((v): v is number => v != null);
        return (
          <li key={t.id}>
            <button
              type="button"
              aria-pressed={selected === t.id}
              onClick={() => onSelect(t.id)}
              className={cx(
                "flex w-full flex-col gap-0.5 rounded-lg border-s-2 border-transparent px-3 py-2 text-left outline-none",
                "hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                // Cyan, like the selected route on the map.
                selected === t.id && "border-cyan-500 bg-background-secondary-default",
              )}
            >
              <span className="flex items-baseline justify-between gap-3 text-body-2-regular">
                <span className="min-w-0 truncate text-text-primary">
                  {nodeName(t.origin)} → {nodeName(t.target)}
                </span>
                <span className="shrink-0 tabular-nums text-text-secondary">{formatWhen(t.heard_at)}</span>
              </span>
              <span className="text-caption-1-regular text-text-tertiary">
                {[
                  t.complete
                    ? formatMessage(
                        {
                          id: "page.meshes.detail.network.traceroutes.hops",
                          defaultMessage: "{count, plural, =0 {Direct} one {# hop} other {# hops}}",
                        },
                        { count: hops },
                      )
                    : formatMessage({
                        id: "page.meshes.detail.network.traceroutes.partial",
                        defaultMessage: "Heard on its way out",
                      }),
                  measured.length
                    ? formatMessage(
                        { id: "page.meshes.detail.network.traceroutes.snrs", defaultMessage: "SNR {values} dB" },
                        { values: measured.map(snr).join(" · ") },
                      )
                    : null,
                  t.distance_km != null
                    ? formatMessage(
                        { id: "page.meshes.detail.network.traceroutes.distance", defaultMessage: "{km} km" },
                        { km: formatNumber(t.distance_km, { maximumFractionDigits: 1 }) },
                      )
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
