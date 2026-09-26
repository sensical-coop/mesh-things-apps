import type { Mesh } from "@mtt/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import { formLevelMessage, readApiError } from "@/lib/api-errors";
import { meshRepository } from "@/features/mesh/repository";
import { meshTitle } from "@/features/mesh/model";
import { termsRepository } from "@/features/terms/repository";
import { TermsDialog } from "@/features/terms/ui/terms-dialog";

export type RenewMeshTermsDialogProps = {
  mesh: Pick<Mesh, "id" | "label" | "channel_id"> | null;
  onClose: () => void;
};

/** Accept the current mesh terms again: resumes a paused mesh and cancels the pending deletion. */
export function RenewMeshTermsDialog({ mesh, onClose }: RenewMeshTermsDialogProps): ReactElement {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const renew = useMutation({
    ...termsRepository.renewMesh(),
    onSuccess: async (renewed) => {
      await queryClient.invalidateQueries({ queryKey: meshRepository.listKey() });
      await queryClient.invalidateQueries({ queryKey: meshRepository.retrieveKey({ path: { mesh_id: renewed.id } }) });
      close();
    },
  });
  const failure = renew.error ? readApiError(renew.error) : null;

  function close() {
    renew.reset();
    onClose();
  }

  return (
    <TermsDialog
      open={mesh !== null}
      kind="mesh"
      onClose={close}
      onAccepted={(acceptance) =>
        // No terms on this instance: nothing to renew.
        !acceptance
          ? close()
          : mesh &&
            renew.mutate({
          path: { mesh_id: mesh.id },
          body: { terms_version: acceptance.version, terms_locale: acceptance.locale },
        })
      }
      acceptLabel={
        mesh
          ? formatMessage({ id: "feature.mesh.renew.accept", defaultMessage: "Renew {mesh}" }, { mesh: meshTitle(mesh) })
          : undefined
      }
      pending={renew.isPending}
      error={
        failure
          ? failure.fields.terms_version
            ? formatMessage({
                id: "feature.terms.renew.outdated",
                defaultMessage: "The terms changed while you were reading. Close and open them again.",
              })
            : failure.status === 502
              ? formatMessage({
                  id: "feature.mesh.renew.resumeFailed",
                  defaultMessage: "The mesh's gateways could not be resumed, so the terms were not renewed. Try again.",
                })
              : (formLevelMessage(renew.error) ??
                formatMessage({ id: "feature.mesh.renew.error", defaultMessage: "The terms were not renewed. Try again." }))
          : null
      }
    />
  );
}
