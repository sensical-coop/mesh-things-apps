import { Chip, type ChipProps } from "@mtt/ui/components/base/badges/chip";
import { cx } from "@mtt/ui/utils/cx";
import { EChartsAreaChart, type ChartConfig } from "@/components/evilcharts/charts/echarts-area-chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type ReactElement, type ReactNode } from "react";
import {
  RiAlarmWarningLine,
  RiBatteryChargeLine,
  RiCheckboxCircleLine,
  RiCloudy2Line,
  RiDashboard3Line,
  RiDropLine,
  RiFlashlightLine,
  RiMistLine,
  RiPercentLine,
  RiPieChart2Line,
  RiPulseLine,
  RiTempHotLine,
  RiWaterPercentLine,
  RiWifiLine,
  RiWindyLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { asNumber, formatClock, formatWhen } from "./format";
import type { Point } from "@mtt/contracts";

export const pageHeadingClass =
  "mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";

export const dialogActionsClass =
  "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto";

export function SkeletonRows({ rows = 3 }: { rows?: number }): ReactElement {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-5 rounded-full bg-background-tertiary-default" />
      ))}
    </div>
  );
}

export function StatusCopy({ children }: { children: ReactNode }): ReactElement {
  return (
    <p className="text-body-regular text-text-secondary" role="status">
      {children}
    </p>
  );
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function seriesConfig(label: string): ChartConfig {
  return {
    value: {
      label,
      colors: { light: ["var(--oa-primary)"], dark: ["var(--oa-primary)"] },
    },
  };
}

const kpiShellClass =
  "oa-squircle-inset flex min-w-0 flex-col bg-background-primary-default p-4";

export function KpiPanel({
  label,
  hint,
  className,
  children,
  icon: Icon = kpiIconFor(label),
  "aria-hidden": ariaHidden,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
  icon?: RemixiconComponentType;
  "aria-hidden"?: boolean;
}): ReactElement {
  return (
    <div className={cx(kpiShellClass, "gap-3", className)} aria-hidden={ariaHidden}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-foreground-icon-tertiary" aria-hidden />
          <p className="text-caption-1-medium text-text-secondary">{label}</p>
        </div>
        {hint ? <p className="text-pretty text-caption-1-regular text-text-tertiary">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function SeriesChart({
  points,
  compareLabel,
  compare,
  label,
  hint,
  className,
  icon,
}: {
  points: Point[];
  compareLabel?: string;
  compare?: Point[];
  label?: string;
  hint?: string;
  className?: string;
  icon?: RemixiconComponentType;
}): ReactElement {
  const body = (
    <>
      <SeriesPlot points={points} seriesLabel={label ?? "Value"} />
      {compare ? (
        <div>
          <p className="mb-2 text-caption-1-medium text-text-secondary">{compareLabel ?? "Compare"}</p>
          <SeriesPlot points={compare} seriesLabel={compareLabel ?? "Compare"} />
        </div>
      ) : null}
    </>
  );

  if (!label) {
    return <div className={cx("flex flex-col gap-4", className)}>{body}</div>;
  }

  return (
    <KpiPanel label={label} hint={hint} icon={icon} className={className}>
      <div className="flex min-w-0 flex-col gap-4">{body}</div>
    </KpiPanel>
  );
}

function SeriesPlot({ points, seriesLabel }: { points: Point[]; seriesLabel: string }): ReactElement {
  const data = points.flatMap((p) => {
    const value = asNumber(p.value);
    return value === null ? [] : [{ time: p.time, value }];
  });
  if (data.length < 2) {
    return <StatusCopy>Need at least two numeric points to draw this channel.</StatusCopy>;
  }

  return (
    <EChartsAreaChart
      data={data}
      config={seriesConfig(seriesLabel)}
      xDataKey="time"
      className="h-52 w-full"
      curveType="monotone"
      animation={false}
    >
      <EChartsAreaChart.Grid />
      <EChartsAreaChart.XAxis dataKey="time" tickFormatter={(value) => formatClock(value)} />
      <EChartsAreaChart.YAxis />
      <EChartsAreaChart.Tooltip labelFormatter={(value) => formatWhen(value)} />
      <EChartsAreaChart.Legend align="left" variant="horizontal-bar" />
      <EChartsAreaChart.Area dataKey="value" variant="gradient" strokeVariant="solid" strokeWidth={2}>
        <EChartsAreaChart.ActiveDot variant="colored-border" />
      </EChartsAreaChart.Area>
    </EChartsAreaChart>
  );
}

export function Flag({
  on,
  yes,
  no,
  onColor = "cyan",
  offColor = "soft",
}: {
  on: boolean;
  yes: string;
  no: string;
  onColor?: ChipProps["color"];
  offColor?: ChipProps["color"];
}): ReactElement {
  return (
    <Chip variant="caption" color={on ? onColor : offColor} className="rounded-full">
      {on ? yes : no}
    </Chip>
  );
}

export type KpiProps = {
  label: string;
  value: string;
  hint?: string;
  className?: string;
  icon?: RemixiconComponentType;
};

const kpiIconRules: [string, RemixiconComponentType][] = [
  ["dew", RiDropLine],
  ["temp", RiTempHotLine],
  ["humid", RiWaterPercentLine],
  ["press", RiDashboard3Line],
  ["baro", RiDashboard3Line],
  ["battery", RiBatteryChargeLine],
  ["volt", RiFlashlightLine],
  ["rssi", RiWifiLine],
  ["snr", RiWifiLine],
  ["signal", RiWifiLine],
  ["iaq", RiMistLine],
  ["voc", RiMistLine],
  ["co2", RiMistLine],
  ["pm", RiCloudy2Line],
  ["dust", RiCloudy2Line],
  ["wind", RiWindyLine],
  ["plausib", RiCheckboxCircleLine],
  ["complete", RiPieChart2Line],
  ["alarm", RiAlarmWarningLine],
  ["ratio", RiPercentLine],
];

export function kpiIconFor(text: string): RemixiconComponentType {
  const haystack = text.toLowerCase();
  return kpiIconRules.find(([needle]) => haystack.includes(needle))?.[1] ?? RiPulseLine;
}

export function Kpi({ label, value, hint, className, icon: Icon = kpiIconFor(label) }: KpiProps): ReactElement {
  return (
    <div className={cx(kpiShellClass, "min-h-24 justify-center gap-1", className)}>
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-foreground-icon-tertiary" aria-hidden />
        <p className="text-caption-1-medium text-text-secondary">{label}</p>
      </div>
      <p className="min-w-0 break-words tabular-nums text-title-2-medium tracking-tight text-text-primary">
        {value}
      </p>
      {hint ? <p className="text-pretty text-caption-1-regular text-text-tertiary">{hint}</p> : null}
    </div>
  );
}
