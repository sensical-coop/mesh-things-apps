import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mtt/ui/components/ui/select";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { CHART_AGG_OPTIONS, availableResolutions, type ChartAgg } from "./chart-resolution";

export function DeviceChartResolutionPicker({
  spanMs,
  resolution,
  onResolutionChange,
  agg,
  onAggChange,
}: {
  spanMs: number;
  resolution: string;
  onResolutionChange: (value: string) => void;
  agg: ChartAgg;
  onAggChange: (value: ChartAgg) => void;
}): ReactElement {
  const { formatMessage } = useIntl();
  const resolutions = availableResolutions(spanMs);

  return (
    <div className="flex items-center gap-2">
      <Select
        items={resolutions.map((option) => ({
          value: option.value,
          label: formatMessage({ id: option.messageId, defaultMessage: option.label }),
        }))}
        value={resolution}
        onValueChange={(value) => onResolutionChange(value as string)}
      >
        <SelectTrigger
          size="sm"
          aria-label={formatMessage({
            id: "page.devices.detail.chartResolution.resolutionLabel",
            defaultMessage: "Resolution",
          })}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {resolutions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {formatMessage({ id: option.messageId, defaultMessage: option.label })}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select
        items={CHART_AGG_OPTIONS.map((option) => ({
          value: option.value,
          label: formatMessage({ id: option.messageId, defaultMessage: option.label }),
        }))}
        value={agg}
        onValueChange={(value) => onAggChange(value as ChartAgg)}
      >
        <SelectTrigger
          size="sm"
          aria-label={formatMessage({
            id: "page.devices.detail.chartResolution.aggLabel",
            defaultMessage: "Aggregation",
          })}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {CHART_AGG_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {formatMessage({ id: option.messageId, defaultMessage: option.label })}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
