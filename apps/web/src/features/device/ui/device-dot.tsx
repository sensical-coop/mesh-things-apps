import { cx } from "@mtt/ui/utils";
import { type ReactElement } from "react";

export type DeviceDotProps = {
  isGateway: boolean;
  size?: "sm" | "md";
  pulse?: boolean;
  className?: string;
};

// Same hues as DeviceKindBadge: the cyan chip background for a gateway, the
// full coral accent for a node (its chip tint is too pale on a basemap). The
// plate keeps translucent fills opaque; the outline lifts pale ones off tiles.
export function DeviceDot({ isGateway, size = "sm", pulse = false, className }: DeviceDotProps): ReactElement {
  const fill = isGateway ? "bg-status-cyan-background" : "bg-accent-500";
  return (
    <span className={cx("relative flex items-center justify-center", size === "sm" ? "size-3" : "size-4", className)} aria-hidden>
      {pulse ? (
        <span className={cx("absolute size-5 animate-ping rounded-full opacity-40 motion-reduce:hidden", fill)} />
      ) : null}
      <span className="relative size-full rounded-full bg-background-primary-default shadow-card">
        <span className={cx("absolute inset-0 rounded-full ring-1 ring-text-primary/40 ring-inset", fill)} />
      </span>
    </span>
  );
}
