import type { DeviceRead, MeshStatsResponse } from "@mtt/contracts";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@mtt/ui/reui/frame";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mtt/ui/components/ui/select";
import { RiBroadcastLine, RiNodeTree, RiPulseLine, RiStackLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { parseAsStringLiteral, useQueryState } from "nuqs";
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
  MESH_STATS_RANGES,
  type MeshStatsRange,
  RANGE_MS,
  newDevices,
  portnumLabel,
  totalTraffic,
  trafficNodeLabel,
  windowMs,
} from "../model";
import { RankedBars, type RankedBar } from "./ranked-bars";
import { TopologySection } from "./topology-section";

const REFRESH_MS = 60_000;
const CHANNEL_UTILIZATION = "device_metrics.channel_utilization";

export function MeshNetworkTab({ meshId, devices }: { meshId: string; devices: DeviceRead[] }): ReactElement {
  const { formatMessage, formatNumber } = useIntl();
  const [range, setRange] = useQueryState("range", parseAsStringLiteral(MESH_STATS_RANGES).withDefault("24h"));
  // react-query pauses the interval while the tab is hidden; the tab unmounts this when it is not selected.
  const stats = useQuery({
    ...readingsRepository.meshStats({ path: { mesh_id: meshId }, query: { range } }),
    refetchInterval: REFRESH_MS,
  });
  const byUuid = useMemo(() => new Map(devices.map((device) => [device.uuid, device])), [devices]);

  const rangeLabels: Record<MeshStatsRange, string> = {
    "1h": formatMessage({ id: "page.meshes.detail.network.range.1h", defaultMessage: "Last hour" }),
    "24h": formatMessage({ id: "page.meshes.detail.network.range.24h", defaultMessage: "Last 24 hours" }),
    "7d": formatMessage({ id: "page.meshes.detail.network.range.7d", defaultMessage: "Last 7 days" }),
    "30d": formatMessage({ id: "page.meshes.detail.network.range.30d", defaultMessage: "Last 30 days" }),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-pretty text-body-2-regular text-text-secondary">
          {formatMessage({
            id: "page.meshes.detail.network.scope",
            defaultMessage:
              "Every packet this mesh's gateways heard, including text, routing and packets that could not be decrypted.",
          })}
        </p>
        <Select
          items={MESH_STATS_RANGES.map((value) => ({ value, label: rangeLabels[value] }))}
          value={range}
          onValueChange={(value) => void setRange(value as MeshStatsRange)}
        >
          <SelectTrigger
            size="sm"
            className="shrink-0"
            aria-label={formatMessage({ id: "page.meshes.detail.network.rangeLabel", defaultMessage: "Range" })}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              {MESH_STATS_RANGES.map((value) => (
                <SelectItem key={value} value={value}>
                  {rangeLabels[value]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
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
      <TopologySection meshId={meshId} range={range} devices={devices} />
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
