import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { StepHeading } from "./step-heading";

export function WelcomeStep({ onContinue }: { onContinue: () => void }): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <div className="flex flex-col gap-5">
      <StepHeading>
        {formatMessage({ id: "page.start.welcome.title", defaultMessage: "Set up your first mesh" })}
      </StepHeading>
      <p className="text-body-medium text-text-secondary">
        <FormattedMessage
          id="page.start.welcome.body"
          defaultMessage="You'll create an account, a mesh, and a gateway that sends readings here. It takes about 10 minutes. Have the Meshtastic app open and a radio with Wi-Fi or Ethernet."
        />
      </p>
      <ol className="list-decimal space-y-1 ps-5 text-body-medium text-text-secondary">
        <li>{formatMessage({ id: "page.start.welcome.stepAccount", defaultMessage: "Create or sign in to your account" })}</li>
        <li>{formatMessage({ id: "page.start.welcome.stepBasics", defaultMessage: "See how a mesh, a gateway, and a reading fit together" })}</li>
        <li>{formatMessage({ id: "page.start.welcome.stepMesh", defaultMessage: "Name the mesh and its channel" })}</li>
        <li>{formatMessage({ id: "page.start.welcome.stepGateway", defaultMessage: "Register the gateway and wait until it is seen" })}</li>
      </ol>
      <Button type="button" size="medium" onClick={onContinue}>
        {formatMessage({ id: "page.start.welcome.continue", defaultMessage: "Continue to account" })}
      </Button>
    </div>
  );
}
