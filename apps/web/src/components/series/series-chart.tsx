import { cx } from "@mtt/ui/utils/cx";
import { type ReactElement } from "react";
import type { Point } from "@mtt/contracts";
import { type RemixiconComponentType } from "@remixicon/react";
import { KpiPanel } from "@/components/kpi/kpi-panel";
import { SeriesPlot } from "@/components/series/series-plot";

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
