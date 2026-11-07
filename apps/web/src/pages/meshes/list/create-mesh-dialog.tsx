import { type ReactElement } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { Modal } from "@/components/modal";
import { NO_SOURCE } from "@/features/mesh/model";
import { type TermsAcceptance } from "@/features/terms/model";
import { routes } from "@/router";
import { MeshForm } from "./mesh-form";

/** How "Create mesh" was started: the traffic's origin, and the mesh terms if it's the default broker. */
export type CreateMeshStart = { sourceId: string | null; termsAcceptance: TermsAcceptance | null };

export function CreateMeshDialog({
  start,
  onClose,
}: {
  start: CreateMeshStart | null;
  onClose: () => void;
}): ReactElement {
  const open = start !== null;
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  return (
    <Modal
      open={open}
      title={formatMessage({ id: "page.meshes.list.createDialog.title", defaultMessage: "Create mesh" })}
      description={formatMessage({
        id: "page.meshes.list.createDialog.description",
        defaultMessage: "Gateways join with this channel id and pre-shared key.",
      })}
      onClose={onClose}
    >
      {open && start ? (
        <MeshForm
          key={`${start.sourceId ?? NO_SOURCE}-${start.termsAcceptance?.version ?? "none"}`}
          sourceId={start.sourceId}
          termsAcceptance={start.termsAcceptance}
          onCancel={onClose}
          onCreated={async (mesh) => {
            onClose();
            await navigate({ to: routes.mesh, params: { meshId: mesh.id } });
          }}
        />
      ) : null}
    </Modal>
  );
}
