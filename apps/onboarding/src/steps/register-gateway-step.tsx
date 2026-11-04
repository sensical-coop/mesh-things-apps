import type { DeviceRead } from "@mtt/contracts";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { GatewayForm } from "@/features/device/gateway-form";
import { StepHeading } from "./step-heading";

export function RegisterGatewayStep({
  meshId,
  onRegistered,
}: {
  meshId: string;
  onRegistered: (device: DeviceRead) => void;
}): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <div className="flex flex-col gap-5">
      <StepHeading>
        {formatMessage({ id: "page.start.register.title", defaultMessage: "Register your gateway" })}
      </StepHeading>
      <p className="text-body-medium text-text-secondary">
        {formatMessage({
          id: "page.start.register.help",
          defaultMessage:
            "The node ID is on the radio's screen or in the Meshtastic app, as hex (with or without !) or as a decimal number.",
        })}
      </p>
      <GatewayForm meshId={meshId} onRegistered={onRegistered} />
    </div>
  );
}
