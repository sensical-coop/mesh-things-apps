import { cx } from "@mtt/ui/utils/cx";
import { type ReactElement } from "react";
import { type RemixiconComponentType } from "@remixicon/react";
import { kpiIconFor } from "@/components/kpi/kpi-icon";
import { kpiShellClass } from "@/components/kpi/kpi-shell";

export type KpiProps = {
  label: string;
  value: string;
  hint?: string;
  className?: string;
  icon?: RemixiconComponentType;
};

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
