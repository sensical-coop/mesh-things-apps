import type { Mesh } from "@mtt/contracts";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { MeshForm } from "@/features/mesh/mesh-form";
import { StepHeading } from "./step-heading";

export function MeshStep({ onCreated }: { onCreated: (mesh: Mesh) => void }): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <div className="flex flex-col gap-5">
      <StepHeading>
        {formatMessage({ id: "page.start.mesh.title", defaultMessage: "Create your mesh" })}
      </StepHeading>
      <p className="text-body-medium text-text-secondary">
        {formatMessage({
          id: "page.start.mesh.help",
          defaultMessage:
            "The channel name and key are the ones in the Meshtastic app. Use a key you created, not the public default, unless you mean the traffic to be readable by anyone.",
        })}
      </p>
      <MeshForm onCreated={onCreated} />
    </div>
  );
}
