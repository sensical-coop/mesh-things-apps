import { cx } from "@mtt/ui/utils/cx";
import { type ReactElement, type ReactNode } from "react";
import { type RemixiconComponentType } from "@remixicon/react";
import { kpiIconFor } from "@/components/kpi/kpi-icon";
import { kpiShellClass } from "@/components/kpi/kpi-shell";

export function KpiPanel({
  label,
  hint,
  className,
  children,
  icon: Icon = kpiIconFor(label),
  action,
  "aria-hidden": ariaHidden,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
  icon?: RemixiconComponentType;
  action?: ReactNode;
  "aria-hidden"?: boolean;
}): ReactElement {
  return (
    <div className={cx(kpiShellClass, "gap-3", className)} aria-hidden={ariaHidden}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Icon className="size-4 shrink-0 text-foreground-icon-tertiary" aria-hidden />
            <p className="text-caption-1-medium text-text-secondary">{label}</p>
          </div>
          {hint ? <p className="text-pretty text-caption-1-regular text-text-tertiary">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
