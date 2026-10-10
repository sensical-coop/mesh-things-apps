import type { DeviceRead, MeshStatsResponse } from "@mtt/contracts";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import { RiBroadcastLine, RiNodeTree, RiPulseLine, RiStackLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactElement, useMemo } from "react";
import { useIntl } from "react-intl";
import { Kpi } from "@/components/kpi/kpi";
import { KpiPanel } from "@/components/kpi/kpi-panel";
import { SeriesChart } from "@/components/series/series-chart";
import { StatusCopy } from "@/components/status-copy";
import { useFormatters } from "@/hooks/use-formatters";
import { deviceTitle } from "@/features/device/model";
import { readingsRepository } from "@/features/readings/repository";
import { routes } from "@/router";
import {
  RANGE_MS,
  newDevices,
  portnumLabel,
  totalTraffic,
  trafficNodeLabel,
  windowMs,
} from "../model";
import { RankedBars, type RankedBar } from "./ranked-bars";
import { StatsRangeBar, useStatsRange } from "./stats-range-bar";

const REFRESH_MS = 60_000;
const CHANNEL_UTILIZATION = "device_metrics.channel_utilization";

/** A mesh's traffic: totals, charts and how packets and gateways break down. */
export function MeshTrafficTab({ meshId, devices }: { meshId: string; devices: DeviceRead[] }): ReactElement {
  const { formatMessage, formatNumber } = useIntl();
  const [range] = useStatsRange();
  // react-query pauses the interval while the tab is hidden; the tab unmounts this when it is not selected.
  const stats = useQuery({
    ...readingsRepository.meshStats({ path: { mesh_id: meshId }, query: { range } }),
    refetchInterval: REFRESH_MS,
  });
  const byUuid = useMemo(() => new Map(devices.map((device) => [device.uuid, device])), [devices]);

  return (
    <div className="flex flex-col gap-6">
      <StatsRangeBar
        description={formatMessage({
          id: "page.meshes.detail.network.scope",
          defaultMessage:
            "Every packet this mesh's gateways heard, including text, routing and packets that could not be decrypted.",
        })}
      />
      {stats.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
          {[0, 1, 2, 3].map((slot) => (
            <div key={slot} className="oa-squircle-inset h-24 bg-background-secondary-default" />
          ))}
        </div>
      ) : null}
      {stats.error ? (
        <StatusCopy>
          {formatMessage({
            id: "page.meshes.detail.network.error",
            defaultMessage: "Network figures did not load. Please check again soon.",
          })}
        </StatusCopy>
      ) : null}
      {stats.data ? (
        <NetworkFigures
          stats={stats.data}
          byUuid={byUuid}
          newNodes={newDevices(devices, RANGE_MS[range], Date.parse(stats.data.generated_at))}
          formatNumber={formatNumber}
        />
      ) : null}
    </div>
  );
}

function NetworkFigures({
  stats,
  byUuid,
  newNodes,
  formatNumber,
}: {
  stats: MeshStatsResponse;
  byUuid: Map<string, DeviceRead>;
  newNodes: number;
  formatNumber: ReturnType<typeof useIntl>["formatNumber"];
}): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const { summary } = stats;
  const dash = formatMessage({ id: "common.format.emDash", defaultMessage: "—" });
  const percent = (value: number | null | undefined) =>
    value == null ? dash : formatNumber(value / 100, { style: "percent", maximumFractionDigits: 1 });
  const bucketMs = windowMs(stats.window);
  const utilization = stats.airtime.find((row) => row.channel === CHANNEL_UTILIZATION);
  const utilizationLabel = formatMessage({
    id: "page.meshes.detail.network.utilizationChart",
    defaultMessage: "Channel utilization (%)",
  });

  const nodeLabel = (entry: { node_id: number; device_uuid: string | null }) => {
    const text = trafficNodeLabel(entry, byUuid, deviceTitle);
    return entry.device_uuid ? (
      <Link to={routes.device} params={{ deviceUuid: entry.device_uuid }} className="hover:text-accent-500">
        {text}
      </Link>
    ) : (
      text
    );
  };
  const typeRows: RankedBar[] = stats.traffic.map((row) => ({
    key: row.name,
    label: portnumLabel(row.name),
    value: row.packets,
    display: formatNumber(row.packets),
  }));
  const nodeRows: RankedBar[] = stats.nodes.map((row) => ({
    key: String(row.node_id),
    label: nodeLabel(row),
    value: row.packets,
    display: formatNumber(row.packets),
  }));
  const gatewayRows: RankedBar[] = stats.gateways.map((row) => ({
    key: String(row.node_id),
    label: nodeLabel(row),
    value: row.receptions,
    display:
      row.rx_snr_mean == null
        ? formatNumber(row.share, { style: "percent", maximumFractionDigits: 0 })
        : formatMessage(
            { id: "page.meshes.detail.network.gateways.shareWithSnr", defaultMessage: "{share} · SNR {snr} dB" },
            {
              share: formatNumber(row.share, { style: "percent", maximumFractionDigits: 0 }),
              snr: formatNumber(row.rx_snr_mean, { maximumFractionDigits: 1 }),
            },
          ),
  }));
  const hopRows: RankedBar[] = stats.hops.map((row) => ({
    key: String(row.hops),
    label:
      row.hops == null
        ? formatMessage({ id: "page.meshes.detail.network.hops.unknown", defaultMessage: "Not reported" })
        : row.hops === 0
          ? formatMessage({ id: "page.meshes.detail.network.hops.direct", defaultMessage: "Direct" })
          : formatMessage(
              { id: "page.meshes.detail.network.hops.count", defaultMessage: "{count, plural, one {# hop} other {# hops}}" },
              { count: row.hops },
            ),
    value: row.packets,
    display: formatNumber(row.packets),
  }));
  const signalRows = (buckets: MeshStatsResponse["signal"]["snr"], unit: string): RankedBar[] =>
    buckets.map((row) => ({
      key: String(row.bucket),
      label: `${formatNumber(row.bucket)} ${unit}`,
      value: row.receptions,
      display: formatNumber(row.receptions),
    }));

  if (summary.receptions === 0) {
    return (
      <StatusCopy>
        {formatMessage({
          id: "page.meshes.detail.network.empty",
          defaultMessage: "No packets heard on this mesh in this range.",
        })}
      </StatusCopy>
    );
  }

  return (
    <>
      <div className="oa-arrive grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="group">
        <Kpi
          icon={RiStackLine}
          label={formatMessage({ id: "page.meshes.detail.network.kpi.packets", defaultMessage: "Packets" })}
          value={formatNumber(summary.packets)}
          hint={formatMessage(
            {
              id: "page.meshes.detail.network.kpi.receptionsDecoded",
              defaultMessage: "{count} receptions · {decoded} decoded",
            },
            {
              count: formatNumber(summary.receptions),
              decoded:
                summary.packets > summary.rejected_packets
                  ? formatNumber(summary.decoded_packets / (summary.packets - summary.rejected_packets), {
                      style: "percent",
                      maximumFractionDigits: 0,
                    })
                  : dash,
            },
          )}
        />
        <Kpi
          icon={RiBroadcastLine}
          label={formatMessage({
            id: "page.meshes.detail.network.kpi.perPacket",
            defaultMessage: "Receptions per packet",
          })}
          value={
            summary.receptions_per_packet == null
              ? dash
              : formatNumber(summary.receptions_per_packet, { maximumFractionDigits: 2 })
          }
          hint={formatMessage({
            id: "page.meshes.detail.network.kpi.perPacketHint",
            defaultMessage: "Gateways that heard each packet",
          })}
        />
        <Kpi
          icon={RiNodeTree}
          label={formatMessage({ id: "page.meshes.detail.network.kpi.activeNodes", defaultMessage: "Active nodes" })}
          value={formatNumber(summary.active_nodes)}
          hint={[
            formatMessage(
              {
                id: "page.meshes.detail.network.kpi.newNodes",
                defaultMessage: "{count, plural, =0 {No new nodes} one {# new node} other {# new nodes}} in this range",
              },
              { count: newNodes },
            ),
            summary.rejected_packets
              ? formatMessage(
                  {
                    id: "page.meshes.detail.network.kpi.rejectedHint",
                    defaultMessage: "{count} packets from rejected nodes",
                  },
                  { count: formatNumber(summary.rejected_packets) },
                )
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <Kpi
          icon={RiPulseLine}
          label={formatMessage({
            id: "page.meshes.detail.network.kpi.utilization",
            defaultMessage: "Channel utilization",
          })}
          value={percent(summary.channel_utilization_mean)}
          hint={
            summary.channel_utilization_peak == null
              ? formatMessage({
                  id: "page.meshes.detail.network.kpi.utilizationNone",
                  defaultMessage: "No node reports device metrics",
                })
              : formatMessage(
                  { id: "page.meshes.detail.network.kpi.utilizationPeak", defaultMessage: "Peak {value}" },
                  { value: percent(summary.channel_utilization_peak) },
                )
          }
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SeriesChart
          points={totalTraffic(stats.traffic)}
          windowMs={bucketMs}
          icon={RiStackLine}
          label={formatMessage({
            id: "page.meshes.detail.network.trafficChart",
            defaultMessage: "Receptions over time",
          })}
          hint={formatMessage(
            { id: "page.meshes.detail.network.bucketHint", defaultMessage: "Per {window}" },
            { window: stats.window },
          )}
        />
        <SeriesChart
          points={stats.activity.nodes}
          windowMs={windowMs(stats.activity_window)}
          icon={RiNodeTree}
          label={formatMessage({ id: "page.meshes.detail.network.activityChart", defaultMessage: "Active nodes" })}
          hint={formatMessage(
            {
              id: "page.meshes.detail.network.activityChartHint",
              defaultMessage: "Nodes that sent at least one packet, per {window}",
            },
            { window: stats.activity_window },
          )}
        />
        <GatewayOverlap stats={stats} byUuid={byUuid} formatNumber={formatNumber} />
        {utilization ? (
          <SeriesChart
            points={utilization.points}
            windowMs={bucketMs}
            icon={RiPulseLine}
            label={utilizationLabel}
            hint={formatMessage({
              id: "page.meshes.detail.network.utilizationChartHint",
              defaultMessage: "Mean across the nodes that report it",
            })}
          />
        ) : (
          <KpiPanel icon={RiPulseLine} label={utilizationLabel}>
            <div className="flex h-52 items-center justify-center rounded-lg bg-background-secondary-default">
              <StatusCopy>
                {formatMessage({
                  id: "page.meshes.detail.network.utilizationNotReported",
                  defaultMessage: "Not reported. No node on this mesh sends device metrics.",
                })}
              </StatusCopy>
            </div>
          </KpiPanel>
        )}
      </div>
      <p className="text-pretty text-caption-1-regular text-text-tertiary">
        {formatMessage(
          {
            id: "page.meshes.detail.network.hourlyNote",
            defaultMessage: "Nodes, gateways, hops and signal are counted per hour, from {start}.",
          },
          { start: formatWhen(stats.hourly_start) },
        )}
      </p>
      <div className="grid gap-6 lg:grid-cols-3">
        <BarsFrame
          title={formatMessage({ id: "page.meshes.detail.network.types.title", defaultMessage: "Packet types" })}
          description={formatMessage({
            id: "page.meshes.detail.network.types.description",
            defaultMessage: "Packets by Meshtastic port.",
          })}
          rows={typeRows}
        />
        <BarsFrame
          title={formatMessage({ id: "page.meshes.detail.network.nodes.title", defaultMessage: "Busiest nodes" })}
          description={formatMessage({
            id: "page.meshes.detail.network.nodes.description",
            defaultMessage: "Packets sent, top 20.",
          })}
          rows={nodeRows}
        />
        <BarsFrame
          title={formatMessage({ id: "page.meshes.detail.network.gateways.title", defaultMessage: "Gateway share" })}
          description={formatMessage({
            id: "page.meshes.detail.network.gateways.description",
            defaultMessage: "Share of all receptions each gateway made, and its mean SNR.",
          })}
          rows={gatewayRows}
        />
        <BarsFrame
          title={formatMessage({ id: "page.meshes.detail.network.hops.title", defaultMessage: "Hops" })}
          description={formatMessage({
            id: "page.meshes.detail.network.hops.description",
            defaultMessage: "Hops each packet took before a gateway first heard it.",
          })}
          rows={hopRows}
        />
        <BarsFrame
          title={formatMessage({ id: "page.meshes.detail.network.snr.title", defaultMessage: "SNR" })}
          description={formatMessage({
            id: "page.meshes.detail.network.snr.description",
            defaultMessage: "Receptions heard over the air, per 2.5 dB.",
          })}
          rows={signalRows(stats.signal.snr, "dB")}
        />
        <BarsFrame
          title={formatMessage({ id: "page.meshes.detail.network.rssi.title", defaultMessage: "RSSI" })}
          description={formatMessage({
            id: "page.meshes.detail.network.rssi.description",
            defaultMessage: "Receptions heard over the air, per 10 dBm.",
          })}
          rows={signalRows(stats.signal.rssi, "dBm")}
        />
      </div>
    </>
  );
}

function GatewayOverlap({
  stats,
  byUuid,
  formatNumber,
}: {
  stats: MeshStatsResponse;
  byUuid: Map<string, DeviceRead>;
  formatNumber: ReturnType<typeof useIntl>["formatNumber"];
}): ReactElement {
  const { formatMessage } = useIntl();
  const receptions = new Map(stats.gateways.map((g) => [g.node_id, g.receptions]));
  const name = (node: number, uuid: string | null) => trafficNodeLabel({ node_id: node, device_uuid: uuid }, byUuid, deviceTitle);
  const share = (common: number, node: number) => {
    const total = receptions.get(node);
    return total ? formatNumber(common / total, { style: "percent", maximumFractionDigits: 0 }) : "—";
  };
  const title = formatMessage({ id: "page.meshes.detail.network.overlap.title", defaultMessage: "Gateway overlap" });
  return (
    <KpiPanel
      icon={RiBroadcastLine}
      label={title}
      hint={formatMessage({
        id: "page.meshes.detail.network.overlap.hint",
        defaultMessage:
          "Packets two gateways both heard, the share of each one's receptions, and how much stronger the first heard them.",
      })}
    >
      {stats.gateway_pairs.length ? (
        <div className="oa-arrive max-h-52 overflow-auto">
          <table className="w-full text-left text-body-2-regular" aria-label={title}>
            <tbody>
              {stats.gateway_pairs.map((pair) => (
                <tr key={`${pair.gateway_a}-${pair.gateway_b}`} className="border-t border-separator-border first:border-t-0">
                  <td className="py-1.5 pe-2 text-text-primary">
                    {name(pair.gateway_a, pair.device_uuid_a)} ↔ {name(pair.gateway_b, pair.device_uuid_b)}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums text-text-primary">{formatNumber(pair.common_packets)}</td>
                  <td className="px-2 py-1.5 tabular-nums text-text-secondary">
                    {share(pair.common_packets, pair.gateway_a)} / {share(pair.common_packets, pair.gateway_b)}
                  </td>
                  <td className="ps-2 py-1.5 tabular-nums text-text-secondary">
                    {pair.snr_diff_mean == null
                      ? "—"
                      : formatMessage(
                          { id: "page.meshes.detail.network.overlap.snrDiff", defaultMessage: "{snr} dB" },
                          {
                            snr: formatNumber(pair.snr_diff_mean, {
                              maximumFractionDigits: 1,
                              signDisplay: "always",
                            }),
                          },
                        )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <StatusCopy>
          {formatMessage({
            id: "page.meshes.detail.network.overlap.none",
            defaultMessage: "No packet was heard by more than one gateway in this range.",
          })}
        </StatusCopy>
      )}
    </KpiPanel>
  );
}

function BarsFrame({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: RankedBar[];
}): ReactElement {
  return (
    <Frame className="shadow-card">
      <FrameHeader>
        <FrameTitle>{title}</FrameTitle>
        <FrameDescription>{description}</FrameDescription>
      </FrameHeader>
      <FramePanel>
        <RankedBars rows={rows} label={title} />
      </FramePanel>
    </Frame>
  );
}
