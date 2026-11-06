import type { DeviceRead } from "@mtt/contracts";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { readingsRepository } from "@/features/readings/repository";
import { MESH_REFRESH_MS } from "../model";
import { StatsRangeBar, useStatsRange } from "./stats-range-bar";
import { TopologySection } from "./topology-section";

/** Who hears whom on a mesh: the links map or graph, traceroutes and relays. */
export function MeshTopologyTab({ meshId, devices }: { meshId: string; devices: DeviceRead[] }): ReactElement {
  const { formatMessage } = useIntl();
  const [range] = useStatsRange();
  // The same query as the Traffic tab, so switching tabs reuses its cached figures for the relays.
  const stats = useQuery({
    ...readingsRepository.meshStats(meshId, { range }),
    refetchInterval: MESH_REFRESH_MS,
  });
  return (
    <div className="flex flex-col gap-6">
      <StatsRangeBar
        description={formatMessage({
          id: "page.meshes.detail.topology.scope",
          defaultMessage:
            "Topology metrics and information about how nodes see each other.",
        })}
      />
      <TopologySection meshId={meshId} range={range} devices={devices} relays={stats.data?.relays ?? []} />
    </div>
  );
}
