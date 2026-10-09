import type { DeviceRead, Traceroute } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { cx } from "@mtt/ui/utils/cx";
import { RiCollapseDiagonalLine, RiExpandDiagonalLine } from "@remixicon/react";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryState } from "nuqs";
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
  nodeHex,
  nodePositions,
  pairLinks,
  routeCoordinates,
} from "../model";
import { LinksMap } from "./links-map";
import { RankedBars, type RankedBar } from "./ranked-bars";

const REFRESH_MS = 60_000;
const TRACEROUTE_PAGE = 20;
const LONGEST_LINKS = 10;
const MAP_SIZES = ["large"] as const;

/** Who hears whom: the links map, the longest links and the traceroutes heard on the mesh. */
export function TopologySection({
  meshId,
  range,
  devices,
}: {
  meshId: string;
  range: MeshStatsRange;
  devices: DeviceRead[];
}): ReactElement {
  const { formatMessage, formatNumber } = useIntl();
  const [mapSize, setMapSize] = useQueryState("map", parseAsStringLiteral(MAP_SIZES));
  const large = mapSize === "large";
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
      route={chosen && route ? { shown: route.length, total: chosen.towards.length } : null}
      nodeName={nodeName}
      snr={snr}
    />
  );
  const tracerouteTitle = formatMessage({
    id: "page.meshes.detail.network.traceroutes.title",
    defaultMessage: "Traceroutes",
  });

  return (
    <>
      <Frame className="shadow-card">
        <FrameHeader>
          <div className="flex items-start justify-between gap-3">
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
              </FrameDescription>
            </div>
            {positions.size ? (
              <Button
                type="button"
                size="small"
                variant="secondary"
                className="shrink-0"
                leadingIcon={large ? RiCollapseDiagonalLine : RiExpandDiagonalLine}
                onClick={() => void setMapSize(large ? null : "large")}
              >
                {large
                  ? formatMessage({ id: "page.meshes.detail.network.links.smaller", defaultMessage: "Smaller map" })
                  : formatMessage({ id: "page.meshes.detail.network.links.larger", defaultMessage: "Larger map" })}
              </Button>
            ) : null}
          </div>
        </FrameHeader>
        <FramePanel>
          {links.isPending ? <SkeletonRows rows={2} /> : null}
          {links.data && positions.size ? (
            large ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <LinksMap pairs={pairs} positions={positions} devices={devices} route={route} large />
                <section className="flex min-h-0 flex-col gap-2 lg:h-[70vh]" aria-label={tracerouteTitle}>
                  <h3 className="text-body-medium text-text-primary">{tracerouteTitle}</h3>
                  <div className="min-h-0 flex-1 overflow-y-auto pe-1">{traceroutePanel}</div>
                </section>
              </div>
            ) : (
              <LinksMap pairs={pairs} positions={positions} devices={devices} route={route} />
            )
          ) : null}
          {links.data && !positions.size ? (
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
                  defaultMessage: "Newest first. Select one to draw its route on the map.",
                })}
              </FrameDescription>
            </FrameHeader>
            <FramePanel>{traceroutePanel}</FramePanel>
          </Frame>
        )}
      </div>
    </>
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
