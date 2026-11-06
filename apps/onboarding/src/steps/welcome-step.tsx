import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { WelcomeFigure } from "@/figures/welcome/figure";
import { StepBlob } from "./step-blob";
import { StepHeading } from "./step-heading";
import { StepLayout } from "./step-layout";

export function WelcomeStep({ onContinue }: { onContinue: () => void }): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <StepLayout figure={<WelcomeFigure />}>
      <div className="flex flex-col gap-3">
        <StepBlob />
        <StepHeading>
          {formatMessage({ id: "page.start.welcome.title", defaultMessage: "Welcome to your first mesh" })}
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
          <li>{formatMessage({ id: "page.start.welcome.stepGateway", defaultMessage: "Register the gateway and wait until a packet arrives" })}</li>
        </ol>
      </div>
      {/* Pinned to the figure's bottom edge on wide screens. */}
      <Button type="button" size="medium" onClick={onContinue} className="lg:mt-auto">
        {formatMessage({ id: "page.start.welcome.continue", defaultMessage: "Continue to account" })}
      </Button>
    </StepLayout>
  );
}
