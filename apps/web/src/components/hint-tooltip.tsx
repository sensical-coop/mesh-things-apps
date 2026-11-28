import { Tooltip, TooltipContent, TooltipTrigger } from "@mtt/ui/components/ui/tooltip";
import { type ReactElement, type ReactNode } from "react";

/** Shows `hint` on hover or focus of its children; renders the children alone when there is none. */
export function HintTooltip({ hint, children }: { hint?: string; children: ReactNode }): ReactElement {
  if (!hint) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger delay={200} className="cursor-help text-left">
        {children}
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{hint}</TooltipContent>
    </Tooltip>
  );
}
