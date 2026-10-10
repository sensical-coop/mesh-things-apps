import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mtt/ui/components/ui/select";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { MESH_STATS_RANGES, type MeshStatsRange } from "../model";

/** The stats range, in the URL so the Traffic and Topology tabs share it. */
export function useStatsRange() {
  return useQueryState("range", parseAsStringLiteral(MESH_STATS_RANGES).withDefault("24h"));
}

/** A tab's one-line scope, with the range picker on its right. */
export function StatsRangeBar({ description }: { description: string }): ReactElement {
  const { formatMessage } = useIntl();
  const [range, setRange] = useStatsRange();
  const labels: Record<MeshStatsRange, string> = {
    "1h": formatMessage({ id: "page.meshes.detail.network.range.1h", defaultMessage: "Last hour" }),
    "24h": formatMessage({ id: "page.meshes.detail.network.range.24h", defaultMessage: "Last 24 hours" }),
    "7d": formatMessage({ id: "page.meshes.detail.network.range.7d", defaultMessage: "Last 7 days" }),
    "30d": formatMessage({ id: "page.meshes.detail.network.range.30d", defaultMessage: "Last 30 days" }),
  };
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-pretty text-body-2-regular text-text-secondary">{description}</p>
      <Select
        items={MESH_STATS_RANGES.map((value) => ({ value, label: labels[value] }))}
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
                {labels[value]}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
