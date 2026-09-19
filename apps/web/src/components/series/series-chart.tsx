import { cx } from "@mtt/ui/utils/cx";
import { type ReactElement } from "react";
import type { Point } from "@mtt/contracts";
import { type RemixiconComponentType } from "@remixicon/react";
import { useIntl } from "react-intl";
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
  const { formatMessage } = useIntl();
  const valueLabel = label ?? formatMessage({ id: "common.seriesChart.value", defaultMessage: "Value" });
  const compareText = compareLabel ?? formatMessage({ id: "common.seriesChart.compare", defaultMessage: "Compare" });
  const body = (
    <>
      <SeriesPlot points={points} seriesLabel={valueLabel} />
      {compare ? (
        <div>
          <p className="mb-2 text-caption-1-medium text-text-secondary">{compareText}</p>
          <SeriesPlot points={compare} seriesLabel={compareText} />
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
