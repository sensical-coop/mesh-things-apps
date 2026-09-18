import type {
  DeviceQualityResponse,
  DeviceRead,
  DeviceTelemetryVariant,
  LatestReading,
  MeasurementTypeRead,
  TelemetryVariantMeasurementRead,
} from "@mtt/contracts";
import { Button, buttonStyles } from "@mtt/ui/components/base/buttons/button";
import { cx } from "@mtt/ui/utils/cx";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@mtt/ui/reui/frame";
import { useMutation, useQueries, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { RiArrowLeftLine } from "@remixicon/react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Map, MapControls, MapMarker, MarkerContent } from "@mtt/ui/components/ui/map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@mtt/ui/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@mtt/ui/components/ui/tooltip";
import { FieldGroup } from "@mtt/ui/components/ui/field";
import { FormCheckbox } from "@/components/form/form-checkbox";
import { FormField } from "@/components/form/form-field";
import { FormNumber } from "@/components/form/form-number";
import { FormSelect } from "@/components/form/form-select";
import { formatLastSeen, formatRatio, formatSecondsAsHms, formatValue, formatWhen } from "@/lib/format";
import { blueprintRepository } from "@/features/blueprint/repository";
import { meshRepository } from "@/features/mesh/repository";
import { meshTitle } from "@/features/mesh/model";
import { readingsRepository } from "@/features/readings/repository";
import { routes } from "@/router";
import { Kpi } from "@/components/kpi/kpi";
import { KpiPanel } from "@/components/kpi/kpi-panel";
import { kpiIconFor } from "@/components/kpi/kpi-icon";
import { SeriesChart } from "@/components/series/series-chart";
import { SkeletonRows } from "@/components/skeleton-rows";
import { StatusCopy } from "@/components/status-copy";
import { Modal } from "@/components/modal";
import { dialogActionsClass } from "@/lib/dialog-actions";
import { chartRangeQuery, defaultChartRange, type DeviceChartRange } from "./chart-range";
import { deviceRepository } from "@/features/device/repository";
import { deviceTitle } from "@/features/device/model";
import { DeviceAllowedBadge } from "@/features/device/ui/allowed-badge";
import { DeviceChartRangePicker } from "./chart-range-picker";
import { DeviceRoleBadge } from "@/features/device/ui/role-badge";
import { DeviceSilentBadge } from "@/features/device/ui/silent-badge";

const NIL_BLUEPRINT_ID = "00000000-0000-4000-8000-000000000000";
const DEVICE_TABS = ["status", "dashboard"] as const;

export function DeviceDetailPage(): ReactElement {
  const { deviceUuid } = useParams({ from: routes.device });
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(DEVICE_TABS).withDefault("status"));
  const device = useQuery(deviceRepository.retrieve({ path: { device_uuid: deviceUuid } }));
  const mesh = useQuery({
    ...meshRepository.retrieve({
      path: { mesh_id: device.data?.mesh_id ?? "00000000-0000-4000-8000-000000000000" },
    }),
    enabled: Boolean(device.data?.mesh_id),
  });
  const catalog = useQuery(readingsRepository.catalog());
  const seen = useQuery(deviceRepository.measurements({ path: { device_uuid: deviceUuid } }));
  const variants = useQuery(deviceRepository.telemetryVariants({ path: { device_uuid: deviceUuid } }));
  const latest = useQuery(readingsRepository.latest({ path: { device_uuid: deviceUuid } }));
  const quality = useQuery(
    readingsRepository.quality({
      path: { device_uuid: deviceUuid },
      query: { start: "-24h" },
    }),
  );
  const variantId = variants.data?.[0]?.telemetry_variant.id;
  const ranges = useQuery({
    ...readingsRepository.variantMeasurements({
      path: { telemetry_variant_id: variantId ?? "00000000-0000-4000-8000-000000000000" },
    }),
    enabled: Boolean(variantId),
  });
  const names = useMemo(
    () => new globalThis.Map((catalog.data ?? []).map((m: MeasurementTypeRead) => [m.channel, m])),
    [catalog.data],
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const chartChannels = useMemo(() => {
    const fromLatest = (latest.data?.readings ?? [])
      .filter((reading) => reading.origin === "measured" || reading.origin === "derived")
      .map((reading) => reading.channel);
    const fromSeen = (seen.data ?? [])
      .filter((row) => {
        const origin = row.measurement_type.origin;
        return origin === "measured" || origin === "derived";
      })
      .map((row) => row.measurement_type.channel);
    return [...new Set([...fromLatest, ...fromSeen])];
  }, [latest.data, seen.data]);

  const latestKpis = useMemo(
    () =>
      (latest.data?.readings ?? []).filter(
        (reading) => reading.origin === "measured" || reading.origin === "derived",
      ),
    [latest.data],
  );

  return (
    <>
      {device.data ? (
        <DeviceSettingsDialog
          device={device.data}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
      <Tabs
        className="flex flex-col gap-0"
        value={tab}
        onValueChange={(value) => {
          if (value === "status" || value === "dashboard") void setTab(value);
        }}
      >
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              to={routes.devices}
              aria-label="Back to devices"
              className={cx(
                buttonStyles.base,
                buttonStyles.size.small,
                buttonStyles.variant.ghost,
                buttonStyles.iconOnlySize.small,
                "shrink-0 rounded-full",
              )}
            >
              <RiArrowLeftLine className={buttonStyles.icon.small} aria-hidden />
            </Link>
            <div className="flex min-w-0 flex-col gap-1">
              {mesh.data ? (
                <p className="text-caption-1-regular text-text-secondary">
                  <Link to={routes.mesh} params={{ meshId: mesh.data.id }} className="hover:text-text-primary">
                    {meshTitle(mesh.data)}
                  </Link>
                </p>
              ) : null}
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="min-w-0 text-balance break-words text-title-2-medium tracking-tight text-text-primary">
                  {device.data ? deviceTitle(device.data) : "Device"}
                </h1>
                {device.data ? <DeviceRoleBadge device={device.data} /> : null}
                {device.data ? <DeviceSilentBadge device={device.data} /> : null}
              </div>
            </div>
          </div>
          {device.data ? (
            <Button type="button" size="small" variant="secondary" onClick={() => setSettingsOpen(true)}>
              Edit settings
            </Button>
          ) : null}
        </div>
        <TabsList className="mt-3 p-1">
          <TabsTrigger value="status" className="px-4 py-1.5 text-body-medium">
            Status
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="px-4 py-1.5 text-body-medium">
            Dashboard
          </TabsTrigger>
        </TabsList>
        <TabsContent value="status" keepMounted className="mt-6 flex flex-col gap-6">
          <DeviceStatusTab
            device={device}
            quality={quality}
            variants={variants}
            ranges={ranges}
            names={names}
          />
        </TabsContent>
        <TabsContent value="dashboard" className="mt-6 flex flex-col gap-6">
          <DeviceDashboardTab
            deviceUuid={deviceUuid}
            ready={Boolean(device.data)}
            latestPending={latest.isPending}
            latestKpis={latestKpis}
            chartChannels={chartChannels}
            names={names}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

type NamesByChannel = Map<string, MeasurementTypeRead>;

function DeviceStatusTab({
  device,
  quality,
  variants,
  ranges,
  names,
}: {
  device: UseQueryResult<DeviceRead>;
  quality: UseQueryResult<DeviceQualityResponse>;
  variants: UseQueryResult<DeviceTelemetryVariant[]>;
  ranges: UseQueryResult<TelemetryVariantMeasurementRead[]>;
  names: NamesByChannel;
}): ReactElement {
  const qualitySummary = quality.data ? qualityHeadlineKpis(quality.data) : [];
  const pointsIngested = quality.data?.points_ingested;
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Frame className="shadow-card">
          <FrameHeader>
            <FrameTitle>Identity</FrameTitle>
            <FrameDescription>
              {device.isPending
                ? "Loading this registration."
                : device.error
                  ? "This device is not in the inventory."
                  : "Registration, hardware, and last time it was heard."}
            </FrameDescription>
          </FrameHeader>
          <FramePanel className="flex-1">
            {device.isPending ? <SkeletonRows rows={4} /> : null}
            {device.data ? (
              <dl className="oa-arrive grid gap-3 sm:grid-cols-2">
                <Item label="Node id" value={String(device.data.node_id)} />
                {device.data.label && device.data.label.trim() !== deviceTitle(device.data) ? (
                  <Item label="Label" value={device.data.label} />
                ) : null}
                <Item
                  label="Allowed"
                  value={<DeviceAllowedBadge allowed={device.data.is_allowed} />}
                />
                <Item label="Last seen" value={formatLastSeen(device.data.last_seen)} />
                <Item label="Hardware" value={device.data.hardware_type ?? "Unknown"} />
                <Item
                  label="Read / publish"
                  value={`${device.data.reading_interval_seconds ?? "—"}s / ${device.data.publish_interval_seconds ?? "—"}s`}
                />
                <Item
                  label="Coordinates"
                  value={
                    device.data.latitude != null && device.data.longitude != null
                      ? `${device.data.latitude}, ${device.data.longitude}${device.data.location_overridden ? " (overridden)" : ""}`
                      : "No coordinates"
                  }
                />
              </dl>
            ) : null}
          </FramePanel>
        </Frame>
        <Frame className="shadow-card">
          <FrameHeader>
            <FrameTitle>Location</FrameTitle>
            <FrameDescription>
              {device.data?.latitude != null && device.data.longitude != null
                ? "Last reported coordinates on the map."
                : "This device has no coordinates yet."}
            </FrameDescription>
          </FrameHeader>
          <FramePanel className="flex min-h-80 flex-1 flex-col">
            {device.isPending ? (
              <div className="min-h-80 flex-1">
                <SkeletonRows rows={6} />
              </div>
            ) : null}
            {device.data?.latitude != null && device.data.longitude != null ? (
              <DeviceLocationMap
                latitude={device.data.latitude}
                longitude={device.data.longitude}
                label={deviceTitle(device.data)}
              />
            ) : (
              !device.isPending && <StatusCopy>No coordinates to plot.</StatusCopy>
            )}
          </FramePanel>
        </Frame>
      </div>
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle>Quality</FrameTitle>
          <FrameDescription>
            {pointsIngested != null
              ? `${pointsIngested.toLocaleString()} points ingested in the last 24 hours.`
              : "Ingest, plausibility, and alarms for the last 24 hours."}
          </FrameDescription>
        </FrameHeader>
        <FramePanel>
          {quality.isPending ? (
            <div className="grid gap-3 sm:grid-cols-3" aria-hidden>
              {["plausibility", "completeness", "alarms"].map((slot) => (
                <div key={slot} className="oa-squircle-inset h-24 bg-background-primary-default" />
              ))}
            </div>
          ) : null}
          {quality.error ? <StatusCopy>Quality did not load. The worker may not have run.</StatusCopy> : null}
          {quality.data ? (
            <div className="flex flex-col gap-6">
              <div className="oa-arrive grid gap-3 sm:grid-cols-3" role="group" aria-label="Quality summary">
                {qualitySummary.map((kpi) => (
                  <Kpi key={kpi.label} label={kpi.label} value={kpi.value} hint={kpi.hint} />
                ))}
              </div>
              {quality.data.channels.length ? (
                <div className="flex flex-col gap-2">
                  <p className="text-caption-1-medium text-text-secondary">By channel</p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[20rem] text-left text-body-2-regular">
                      <thead>
                        <tr>
                          <th className="h-8 pe-2 text-caption-1-medium text-text-secondary">Channel</th>
                          <th className="h-8 px-2 text-caption-1-medium text-text-secondary">Complete</th>
                          <th className="h-8 px-2 text-caption-1-medium text-text-secondary">Observed</th>
                          <th className="h-8 ps-2 text-caption-1-medium text-text-secondary">Largest gap</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quality.data.channels.map((row) => (
                          <tr key={row.channel}>
                            <td className="pe-2 py-1.5 text-text-primary">
                              {names.get(row.channel)?.display_name ?? row.channel}
                            </td>
                            <td className="px-2 py-1.5 tabular-nums text-text-primary">
                              {formatRatio(row.completeness_ratio)}
                            </td>
                            <td className="px-2 py-1.5 tabular-nums text-text-secondary">
                              {row.observed ?? "—"} / {row.expected ?? "—"}
                            </td>
                            <td className="ps-2 py-1.5 tabular-nums text-text-secondary">
                              {formatGapShort(row.largest_gap_seconds)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <StatusCopy>No quality channels yet.</StatusCopy>
              )}
            </div>
          ) : null}
        </FramePanel>
      </Frame>
      <Frame className="shadow-card">
        <FrameHeader>
          <FrameTitle>Telemetry variants</FrameTitle>
          <FrameDescription>Payload families this device has sent, plus curated plausibility ranges.</FrameDescription>
        </FrameHeader>
        <FramePanel>
          {variants.isPending ? <SkeletonRows rows={2} /> : null}
          {variants.data?.length ? (
            <ul className="oa-arrive flex flex-col gap-2 text-body-medium text-text-primary">
              {variants.data.map((row) => (
                <li key={row.id} className="flex min-w-0 flex-col gap-1 sm:flex-row sm:justify-between sm:gap-3">
                  <span className="min-w-0 break-words">{row.telemetry_variant.name ?? row.telemetry_variant.payload_kind}</span>
                  <span className="min-w-0 break-words text-caption-1-regular text-text-secondary sm:text-end">
                    last {formatWhen(row.last_seen)}
                    {row.telemetry_variant.default_reading_interval_seconds
                      ? ` · ${row.telemetry_variant.default_reading_interval_seconds}s`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            !variants.isPending && <StatusCopy>No telemetry variants discovered yet.</StatusCopy>
          )}
          {ranges.data?.length ? (
            <ul className="mt-3 flex flex-col gap-1 text-caption-1-regular text-text-secondary">
              {ranges.data.map((row) => (
                <li key={row.id}>
                  {row.measurement_type.display_name ?? row.measurement_type.channel}: {row.valid_min ?? "—"} … {row.valid_max ?? "—"}
                </li>
              ))}
            </ul>
          ) : null}
        </FramePanel>
      </Frame>
    </>
  );
}

function DeviceDashboardTab({
  deviceUuid,
  ready,
  latestPending,
  latestKpis,
  chartChannels,
  names,
}: {
  deviceUuid: string;
  ready: boolean;
  latestPending: boolean;
  latestKpis: LatestReading[];
  chartChannels: string[];
  names: NamesByChannel;
}): ReactElement {
  const [range, setRange] = useState<DeviceChartRange>(defaultChartRange);
  const rangeQuery = chartRangeQuery(range);
  const seriesQueries = useQueries({
    queries: chartChannels.map((channel) => ({
      ...readingsRepository.series({
        path: { device_uuid: deviceUuid },
        query: {
          channel,
          start: rangeQuery.start,
          stop: rangeQuery.stop,
          window: rangeQuery.window,
          agg: "mean",
        },
      }),
      enabled: ready,
    })),
  });

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4" aria-label="Latest readings">
        <div className="flex flex-col gap-1">
          <h2 className="text-title-3-medium text-text-primary">Latest readings</h2>
          <p className="text-body-regular text-text-secondary">Current values from this device.</p>
        </div>
        {latestPending ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
            {["a", "b", "c", "d"].map((slot) => (
              <div key={slot} className="oa-squircle-inset h-24 bg-background-primary-default" />
            ))}
          </div>
        ) : null}
        {latestKpis.length ? (
          <div className="oa-arrive grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Latest readings">
            {latestKpis.map((reading) => {
              const type = names.get(reading.channel);
              const unit = reading.unit ?? type?.native_unit;
              return (
                <Kpi
                  key={reading.channel}
                  icon={kpiIconFor(`${reading.field_name} ${reading.channel}`)}
                  label={type?.display_name ?? reading.channel}
                  value={`${formatValue(reading.value)}${unit ? ` ${unit}` : ""}`}
                  hint={formatWhen(reading.time)}
                />
              );
            })}
          </div>
        ) : (
          !latestPending && <StatusCopy>No readings in the lookback.</StatusCopy>
        )}
      </section>

      <section className="flex flex-col gap-6" aria-label="Historical series">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-title-3-medium text-text-primary">History</h2>
            <p className="text-body-regular text-text-secondary">Mean values per channel for the selected range.</p>
          </div>
          <DeviceChartRangePicker value={range} onChange={setRange} />
        </div>
        {chartChannels.length ? (
          <div className="oa-arrive grid items-start gap-3 sm:grid-cols-2">
            {chartChannels.map((channel, index) => {
              const series = seriesQueries[index];
              const type = names.get(channel);
              const points = series?.data?.series[0]?.points;
              const label = type?.display_name ?? channel;
              const hint = type?.native_unit ? `Mean · ${type.native_unit}` : "Mean";
              const icon = kpiIconFor(`${type?.field_name ?? ""} ${channel}`);
              if (series?.isPending) {
                return (
                  <KpiPanel key={channel} label={label} hint={hint} icon={icon} className="min-h-52" aria-hidden>
                    <SkeletonRows rows={5} />
                  </KpiPanel>
                );
              }
              if (series?.error) {
                return (
                  <KpiPanel key={channel} label={label} hint={hint} icon={icon} className="min-h-52 justify-center">
                    <StatusCopy>This series did not load.</StatusCopy>
                  </KpiPanel>
                );
              }
              if (!points?.length) {
                return (
                  <KpiPanel key={channel} label={label} hint={hint} icon={icon} className="min-h-52 justify-center">
                    <StatusCopy>No points in this range for this channel.</StatusCopy>
                  </KpiPanel>
                );
              }
              return (
                <SeriesChart key={channel} label={label} hint={hint} icon={icon} points={points} className="min-h-52" />
              );
            })}
          </div>
        ) : (
          !latestPending && <StatusCopy>No measured series on this device yet.</StatusCopy>
        )}
      </section>
    </div>
  );
}

type IntervalSecondsFieldProps = {
  id: string;
  name: string;
  label: string;
  defaultValue: number | null;
};

function IntervalSecondsField({ id, name, label, defaultValue }: IntervalSecondsFieldProps): ReactElement {
  const [seconds, setSeconds] = useState(defaultValue);
  return (
    <FormField id={id} label={label}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <FormNumber id={id} name={name} min={0} defaultValue={defaultValue ?? undefined} onValueChange={setSeconds} />
        </div>
        <p className="shrink-0 whitespace-nowrap text-caption-1-regular text-text-tertiary tabular-nums" aria-live="polite">
          {formatSecondsAsHms(seconds)}
        </p>
      </div>
    </FormField>
  );
}

function DeviceSettingsDialog({
  device,
  open,
  onClose,
}: {
  device: DeviceRead;
  open: boolean;
  onClose: () => void;
}): ReactElement {
  const queryClient = useQueryClient();
  const blueprints = useQuery(blueprintRepository.list());
  const [error, setError] = useState<string | null>(null);
  const update = useMutation({
    ...deviceRepository.update(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: deviceRepository.retrieveKey({ path: { device_uuid: device.uuid } }),
      });
      onClose();
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lat = String(form.get("latitude") ?? "").trim();
    const lon = String(form.get("longitude") ?? "").trim();
    if ((lat === "") !== (lon === "")) {
      setError("Latitude and longitude must be provided together.");
      return;
    }
    setError(null);
    const blueprint = String(form.get("postprocessing_blueprint_id") ?? "");
    const blueprintId = blueprint === "__none__" ? "" : blueprint;
    update.mutate({
      path: { device_uuid: device.uuid },
      body: {
        is_allowed: form.get("is_allowed") === "on",
        reading_interval_seconds: Number(form.get("reading_interval_seconds")) || null,
        publish_interval_seconds: Number(form.get("publish_interval_seconds")) || null,
        postprocessing_blueprint_id: blueprintId || NIL_BLUEPRINT_ID,
        latitude: lat === "" ? null : Number(lat),
        longitude: lon === "" ? null : Number(lon),
      },
    });
  }

  return (
    <Modal
      open={open}
      title="Edit settings"
      description="Allowed, intervals, blueprint, and coordinates."
      onClose={onClose}
    >
      <form key={`${device.uuid}-${open}`} className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
          <FormCheckbox id="device-allowed" name="is_allowed" label="Allowed" defaultChecked={device.is_allowed} />
          <IntervalSecondsField
            id="device-reading"
            name="reading_interval_seconds"
            label="Reading interval (s)"
            defaultValue={device.reading_interval_seconds}
          />
          <IntervalSecondsField
            id="device-publish"
            name="publish_interval_seconds"
            label="Publish interval (s)"
            defaultValue={device.publish_interval_seconds}
          />
          <FormField id="device-blueprint" label="Blueprint">
            <FormSelect
              id="device-blueprint"
              name="postprocessing_blueprint_id"
              defaultValue={
                device.postprocessing_blueprint_id === NIL_BLUEPRINT_ID
                  ? "__none__"
                  : device.postprocessing_blueprint_id
              }
              items={[
                { label: "None", value: "__none__" },
                ...(blueprints.data ?? []).map((bp) => ({ label: bp.name, value: bp.id })),
              ]}
            />
          </FormField>
          <FormField id="device-lat" label="Latitude">
            <FormNumber
              id="device-lat"
              name="latitude"
              min={-90}
              max={90}
              step="any"
              defaultValue={device.latitude ?? undefined}
            />
          </FormField>
          <FormField id="device-lon" label="Longitude">
            <FormNumber
              id="device-lon"
              name="longitude"
              min={-180}
              max={180}
              step="any"
              defaultValue={device.longitude ?? undefined}
            />
          </FormField>
        </FieldGroup>
        {error || update.error ? <StatusCopy>{error ?? "Update failed."}</StatusCopy> : null}
        <div className={dialogActionsClass}>
          <Button type="button" variant="secondary" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="small" disabled={update.isPending}>
            {update.isPending ? "Saving" : "Save settings"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeviceLocationMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label: string;
}): ReactElement {
  return (
    <div className="oa-arrive oa-squircle-inset min-h-80 flex-1 overflow-hidden">
      <Map center={[longitude, latitude]} zoom={14} className="h-full min-h-80 w-full">
        <MapControls />
        <MapMarker longitude={longitude} latitude={latitude}>
          <MarkerContent>
            <Tooltip>
              <TooltipTrigger
                delay={0}
                aria-label={label}
                className="relative flex size-5 items-center justify-center rounded-full bg-transparent p-0"
              >
                <span className="absolute size-5 animate-ping rounded-full bg-accent-500/40 motion-reduce:hidden" aria-hidden />
                <span className="relative size-2.5 rounded-full bg-accent-500 ring-2 ring-background-primary-default" aria-hidden />
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>{label}</TooltipContent>
            </Tooltip>
          </MarkerContent>
        </MapMarker>
      </Map>
    </div>
  );
}

/** Status tab: headline signals only; per-channel detail lives in the table below. */
function qualityHeadlineKpis(quality: DeviceQualityResponse): { label: string; value: string; hint: string }[] {
  const alarms = Object.entries(quality.alarms_by_detector);
  const alarmCount = alarms.reduce((sum, [, n]) => sum + n, 0);
  const alarmHint =
    alarmCount === 0
      ? "No detector alarms"
      : alarms
          .filter(([, n]) => n > 0)
          .map(([detector, n]) => `${detector.replaceAll("_", " ")} ${n}`)
          .join(" · ");
  const ratios = quality.channels
    .map((row) => row.completeness_ratio)
    .filter((n): n is number => n != null && Number.isFinite(n));
  const completeness = ratios.length ? ratios.reduce((sum, n) => sum + n, 0) / ratios.length : null;
  return [
    {
      label: "Plausibility",
      value: formatRatio(quality.plausibility_ratio),
      hint: "Readings inside expected range",
    },
    {
      label: "Completeness",
      value: formatRatio(completeness),
      hint: quality.channels.length ? `Mean across ${quality.channels.length} channels` : "No channels yet",
    },
    {
      label: "Alarms",
      value: String(alarmCount),
      hint: alarmHint,
    },
  ];
}

function formatGapShort(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.round(seconds / 60)} min`;
}

function Item({ label, value }: { label: string; value: ReactElement | string }): ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption-1-medium text-text-secondary">{label}</dt>
      <dd className="min-w-0 break-words text-body-medium text-text-primary">{value}</dd>
    </div>
  );
}
