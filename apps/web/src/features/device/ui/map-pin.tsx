import { cx } from "@mtt/ui/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@mtt/ui/components/ui/tooltip";
import { Link } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { routes } from "@/router";
import { DeviceDot } from "@/features/device/ui/device-dot";

export type DeviceMapPinProps = {
  isGateway: boolean;
  label: string;
  /** Opens this device's page on click. Omit on the device's own page. */
  deviceUuid?: string;
  pulse?: boolean;
};

export function DeviceMapPin({ isGateway, label, deviceUuid, pulse }: DeviceMapPinProps): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger
        delay={0}
        aria-label={label}
        className={cx(
          "relative flex size-5 items-center justify-center rounded-full bg-transparent p-0 outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          deviceUuid && "cursor-pointer transition-transform hover:scale-125 motion-reduce:transition-none",
        )}
        render={deviceUuid ? <Link to={routes.device} params={{ deviceUuid }} /> : undefined}
      >
        <DeviceDot isGateway={isGateway} pulse={pulse} />
      </TooltipTrigger>
      <TooltipContent sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  );
}
