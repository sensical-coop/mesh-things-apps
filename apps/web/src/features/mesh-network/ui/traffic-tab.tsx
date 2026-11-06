import type { DeviceRead } from "@mtt/contracts";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, useMemo } from "react";
import { useIntl } from "react-intl";
import { StatusCopy } from "@/components/status-copy";
import { readingsRepository } from "@/features/readings/repository";
import { MESH_REFRESH_MS, RANGE_MS, newDevices } from "../model";
import { NetworkFigures } from "./network-figures";
import { StatsRangeBar, useStatsRange } from "./stats-range-bar";

export function MeshTrafficTab({ meshId, devices }: { meshId: string; devices: DeviceRead[] }): ReactElement {
  const { formatMessage, formatNumber } = useIntl();
  const [range] = useStatsRange();
  // react-query pauses the interval while the tab is hidden; the tab unmounts this when it is not selected.
  const stats = useQuery({
    ...readingsRepository.meshStats(meshId, { range }),
    refetchInterval: MESH_REFRESH_MS,
  });
  const byUuid = useMemo(() => new Map(devices.map((device) => [device.uuid, device])), [devices]);

  return (
    <div className="flex flex-col gap-6">
      <StatsRangeBar
        description={formatMessage({
          id: "page.meshes.detail.network.scope",
          defaultMessage:
            "Statistics for packets in this mesh's gateways (including text, routing and packets that could not be decrypted).",
        })}
      />
      {stats.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
          {[0, 1, 2, 3].map((slot) => (
            <div key={slot} className="h-24 oa-squircle-inset bg-background-secondary-default" />
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
