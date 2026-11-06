import type {
  DeviceRead,
  LatestReading,
} from "@mtt/contracts";
import { useQueries } from "@tanstack/react-query";
import { type ReactElement, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useFormatters } from "@/hooks/use-formatters";
import { readingsRepository } from "@/features/readings/repository";
import { Kpi } from "@/components/kpi/kpi";
import { KpiPanel } from "@/components/kpi/kpi-panel";
import { kpiIconFor } from "@/components/kpi/kpi-icon";
import { AlarmBellButton } from "@/features/alarm/ui/alarm-bell-button";
import { ChannelActionsMenu } from "./channel-actions-menu";
import { SeriesChart } from "@/components/series/series-chart";
import { parseWindowMs } from "@/lib/duration";
import { channelShortName, isDerivedMeasurement } from "@/lib/measurement";
import { ComputedFlag } from "@/components/computed-flag";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { chartRangeQuery, defaultChartRange, windowForSpanMs, type DeviceChartRange } from "./chart-range";
import { CHART_AGG_OPTIONS, availableResolutions, type ChartAgg } from "./chart-resolution";
import { DeviceChartResolutionPicker } from "./chart-resolution-picker";
import { DeviceChartRangePicker } from "./chart-range-picker";


import { chartAnchorId } from "./chart-anchor";
import type { NamesByChannel } from "./device-status-tab";

export type LatestKpiGroup = { key: string; title: string; readings: LatestReading[] };
export type ChartChannelGroup = { key: string; title: string; channels: string[] };

export function DeviceDashboardTab({
  deviceUuid,
  device,
  ready,
  latestPending,
  latestGroups,
  chartChannels,
  chartChannelGroups,
  names,
  canEdit,
  canArchive,
  scrollToChannel,
  onScrolled,
}: {
  deviceUuid: string;
  device: DeviceRead | undefined;
  ready: boolean;
  latestPending: boolean;
  latestGroups: LatestKpiGroup[];
  chartChannels: string[];
  chartChannelGroups: ChartChannelGroup[];
  names: NamesByChannel;
  canEdit: boolean;
  canArchive: boolean;
  scrollToChannel: string | null;
  onScrolled: () => void;
}): ReactElement {
  const { formatMessage } = useIntl();
  const { formatValue, formatWhen } = useFormatters();
  const [range, setRange] = useState<DeviceChartRange>(defaultChartRange);
  const rangeQuery = chartRangeQuery(range);
  const [resolution, setResolution] = useState(() => windowForSpanMs(range.spanMs));
  const [agg, setAgg] = useState<ChartAgg>("mean");

  // The resolution ladder is bounded by the selected range (so a 30-day range
  // can't be asked for at 1-minute buckets); when the range grows/shrinks past
  // what the current resolution supports, fall back to that range's default.
  useEffect(() => {
    const valid = availableResolutions(range.spanMs);
    if (!valid.some((option) => option.value === resolution)) {
      setResolution(windowForSpanMs(range.spanMs));
    }
  }, [range.spanMs, resolution]);

  const windowMs = parseWindowMs(resolution);
  const seriesQueries = useQueries({
    queries: chartChannels.map((channel) => ({
      ...readingsRepository.series(deviceUuid, {
        channel,
        start: rangeQuery.start,
        stop: rangeQuery.stop,
        window: resolution,
        agg,
      }),
      enabled: ready,
    })),
  });

  useEffect(() => {
    if (!scrollToChannel || !chartChannels.includes(scrollToChannel)) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(chartAnchorId(scrollToChannel))?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    onScrolled();
    return () => cancelAnimationFrame(frame);
  }, [scrollToChannel, chartChannels, onScrolled]);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4" aria-label="Latest readings">
        <div className="flex flex-col gap-1">
          <h2 className="text-title-3-medium text-text-primary">
            {formatMessage({ id: "page.devices.detail.dashboard.latest.title", defaultMessage: "Latest readings" })}
          </h2>
          <p className="text-body-regular text-text-secondary">
            {formatMessage({
              id: "page.devices.detail.dashboard.latest.description",
              defaultMessage: "Current values from this device.",
            })}
          </p>
        </div>
        {latestPending ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
            {["a", "b", "c", "d"].map((slot) => (
              <div key={slot} className="h-24 oa-squircle-inset bg-background-primary-default" />
            ))}
          </div>
        ) : null}
        {latestGroups.length ? (
          <div className="flex oa-arrive flex-col gap-5">
            {latestGroups.map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <h3 className="min-w-0 text-body-medium wrap-break-word text-text-primary">{group.title}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label={group.title}>
                  {group.readings.map((reading) => {
                    const type = names.get(reading.channel);
                    const unit = reading.unit ?? type?.native_unit;
                    return (
                      <Kpi
                        key={reading.channel}
                        icon={kpiIconFor(`${reading.field_name} ${reading.channel}`)}
                        label={reading.field_name}
                        value={`${formatValue(reading.value)}${unit ? ` ${unit}` : ""}`}
                        hint={formatWhen(reading.time)}
                        badge={isDerivedMeasurement(reading) ? <ComputedFlag /> : undefined}
                        action={
                          canArchive && device ? (
                            <ChannelActionsMenu device={device} channel={reading.channel} label={reading.field_name} />
                          ) : canEdit ? (
                            <AlarmBellButton deviceUuid={deviceUuid} channel={reading.channel} label={reading.field_name} />
                          ) : undefined
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          !latestPending && (
            <StatusCopy>
              {formatMessage({
                id: "page.devices.detail.dashboard.latest.none",
                defaultMessage: "No readings found.",
              })}
            </StatusCopy>
          )
        )}
      </section>

      <section className="flex flex-col gap-6" aria-label="Historical series">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-title-3-medium text-text-primary">
              {formatMessage({ id: "page.devices.detail.dashboard.history.title", defaultMessage: "History" })}
            </h2>
            <p className="text-body-regular text-text-secondary">
              {formatMessage({
                id: "page.devices.detail.dashboard.history.description",
                defaultMessage: "Values per channel for the selected range, resolution, and aggregation.",
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DeviceChartResolutionPicker
              spanMs={range.spanMs}
              resolution={resolution}
              onResolutionChange={setResolution}
              agg={agg}
              onAggChange={setAgg}
            />
            <DeviceChartRangePicker value={range} onChange={setRange} />
          </div>
        </div>
        {chartChannelGroups.length ? (
          <div className="flex oa-arrive flex-col gap-6">
            {chartChannelGroups.map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <h3 className="min-w-0 text-body-medium wrap-break-word text-text-primary">{group.title}</h3>
                <div className="grid items-start gap-3 sm:grid-cols-2">
                  {group.channels.map((channel) => {
                    const index = chartChannels.indexOf(channel);
                    const series = seriesQueries[index];
                    const type = names.get(channel);
                    const points = series?.data?.series[0]?.points;
                    const label = channelShortName(channel);
                    const computed = isDerivedMeasurement({ channel });
                    const badge = computed ? <ComputedFlag /> : undefined;
                    // CHART_AGG_OPTIONS covers every ChartAgg value, so this always matches.
                    const aggOption = CHART_AGG_OPTIONS.find((option) => option.value === agg)!;
                    const aggLabel = formatMessage({ id: aggOption.messageId, defaultMessage: aggOption.label });
                    const hint = type?.native_unit
                      ? formatMessage(
                          { id: "page.devices.detail.dashboard.history.aggHint", defaultMessage: "{agg} · {unit}" },
                          { agg: aggLabel, unit: type.native_unit },
                        )
                      : aggLabel;
                    const icon = kpiIconFor(`${type?.field_name ?? ""} ${channel}`);
                    let content: ReactElement;
                    if (series?.isPending) {
                      content = (
                        <KpiPanel label={label} hint={hint} icon={icon} badge={badge} className="min-h-52" aria-hidden>
                          <SkeletonRows rows={5} />
                        </KpiPanel>
                      );
                    } else if (series?.error) {
                      content = (
                        <KpiPanel label={label} hint={hint} icon={icon} badge={badge} className="min-h-52 justify-center">
                          <StatusCopy>
                            {formatMessage({
                              id: "page.devices.detail.dashboard.history.seriesError",
                              defaultMessage: "This series did not load.",
                            })}
                          </StatusCopy>
                        </KpiPanel>
                      );
                    } else if (!points?.length) {
                      content = (
                        <KpiPanel label={label} hint={hint} icon={icon} badge={badge} className="min-h-52 justify-center">
                          <StatusCopy>
                            {formatMessage({
                              id: "page.devices.detail.dashboard.history.noPoints",
                              defaultMessage: "No points in this range for this channel.",
                            })}
                          </StatusCopy>
                        </KpiPanel>
                      );
                    } else {
                      content = (
                        <SeriesChart
                          label={label}
                          hint={hint}
                          icon={icon}
                          badge={badge}
                          computed={computed}
                          points={points}
                          windowMs={windowMs}
                          className="min-h-52"
                        />
                      );
                    }
                    return (
                      <div key={channel} id={chartAnchorId(channel)} className="scroll-mt-6">
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          !latestPending && (
            <StatusCopy>
              {formatMessage({
                id: "page.devices.detail.dashboard.history.none",
                defaultMessage: "No measured series on this device yet.",
              })}
            </StatusCopy>
          )
        )}
      </section>
    </div>
  );
}

