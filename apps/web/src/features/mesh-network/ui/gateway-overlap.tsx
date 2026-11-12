import type { DeviceRead, MeshStatsResponse } from "@mtt/contracts";
import { RiBroadcastLine } from "@remixicon/react";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { KpiPanel } from "@/components/kpi/kpi-panel";
import { StatusCopy } from "@/components/status-copy";
import { deviceTitle } from "@/features/device/model";
import {
  trafficNodeLabel,
} from "../model";

export function GatewayOverlap({
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
          "Packets seen by two gateways, including how much those represent of each one's receptions, and how much stronger the first gateway saw them.",
      })}
    >
      {stats.gateway_pairs.length ? (
        <ul className="flex max-h-52 oa-arrive flex-col overflow-y-auto" aria-label={title}>
          {stats.gateway_pairs.map((pair) => (
            <li
              key={`${pair.gateway_a}-${pair.gateway_b}`}
              className="flex flex-col gap-0.5 border-t border-separator-border py-1.5 first:border-t-0 first:pt-0"
            >
              <span className="min-w-0 truncate text-body-2-regular text-text-primary">
                {name(pair.gateway_a, pair.device_uuid_a)} ↔ {name(pair.gateway_b, pair.device_uuid_b)}
              </span>
              <span className="text-caption-1-regular text-text-tertiary tabular-nums">
                {[
                  formatMessage(
                    { id: "page.meshes.detail.network.overlap.packets", defaultMessage: "{count} packets" },
                    { count: formatNumber(pair.common_packets) },
                  ),
                  formatMessage(
                    {
                      id: "page.meshes.detail.network.overlap.shares",
                      defaultMessage: "{a} and {b} of their receptions",
                    },
                    { a: share(pair.common_packets, pair.gateway_a), b: share(pair.common_packets, pair.gateway_b) },
                  ),
                  pair.snr_diff_mean == null
                    ? null
                    : formatMessage(
                        { id: "page.meshes.detail.network.overlap.snrDiff", defaultMessage: "{snr} dB" },
                        { snr: formatNumber(pair.snr_diff_mean, { maximumFractionDigits: 1, signDisplay: "always" }) },
                      ),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ul>
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
