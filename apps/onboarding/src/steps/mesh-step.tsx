import type { Mesh } from "@mtt/contracts";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { MeshForm } from "@/features/mesh/mesh-form";
import { MeshFigure } from "@/figures/mesh/figure";
import { StepBlob } from "./step-blob";
import { StepHeading } from "./step-heading";
import { StepLayout } from "./step-layout";

export function MeshStep({ onCreated }: { onCreated: (mesh: Mesh) => void }): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <MeshForm onCreated={onCreated}>
      {(fields, footer) => (
        <StepLayout figure={<MeshFigure />} footer={footer}>
          <div className="flex flex-col gap-3">
            <StepBlob />
            <StepHeading>
              {formatMessage({ id: "page.start.mesh.title", defaultMessage: "Create your mesh" })}
            </StepHeading>
            <p className="text-body-medium text-text-secondary">
              {formatMessage({
                id: "page.start.mesh.help",
                defaultMessage: "Copy the channel name and key from the Meshtastic app.",
              })}
            </p>
          </div>
          {fields}
        </StepLayout>
      )}
    </MeshForm>
  );
}
