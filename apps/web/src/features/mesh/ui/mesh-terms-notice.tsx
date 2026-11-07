import type { Mesh } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { StatusCopy } from "@/components/status-copy";
import { meshRepository } from "@/features/mesh/repository";
import { meshTitle } from "@/features/mesh/model";
import type { TermsStanding } from "@/features/terms/model";
import { termsRepository } from "@/features/terms/repository";
import { RenewTermsDialog } from "@/features/terms/ui/renew-terms-dialog";
import { useFormatters } from "@/hooks/use-formatters";

export type MeshTermsNoticeProps = {
  mesh: Pick<Mesh, "id" | "label" | "channel_id" | "terms_expires_at">;
  standing: TermsStanding;
  /** Only the owner renews; superusers see the notice without the button. */
  canRenew: boolean;
};

/** On the mesh page when its terms need attention: lapsed, lapsing soon, changed, or never accepted. */
export function MeshTermsNotice({ mesh, standing, canRenew }: MeshTermsNoticeProps): ReactElement | null {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const renew = useMutation({
    ...termsRepository.renewMesh(),
    onSuccess: async (renewed) => {
      await queryClient.invalidateQueries({ queryKey: meshRepository.listKey() });
      await queryClient.invalidateQueries({ queryKey: meshRepository.retrieveKey(renewed.id) });
      renew.reset();
      setOpen(false);
    },
  });
  if (standing === "ok") return null;
  const message = {
    lapsed: formatMessage({
      id: "feature.mesh.terms.lapsed",
      defaultMessage:
        "This mesh's terms lapsed, so it stopped storing new data. What it stored will be deleted unless its terms are renewed soon.",
    }),
    expiring: formatMessage(
      {
        id: "feature.mesh.terms.expiring",
        defaultMessage: "This mesh's terms lapse on {when}. Renew them to keep storing its data.",
      },
      { when: mesh.terms_expires_at ? formatWhen(mesh.terms_expires_at) : "" },
    ),
    outdated: formatMessage({
      id: "feature.mesh.terms.outdated",
      defaultMessage: "The mesh terms changed since they were accepted for this mesh. Accept the new version.",
    }),
    none: formatMessage({
      id: "feature.mesh.terms.none",
      defaultMessage: "No terms have been accepted for this mesh yet.",
    }),
  }[standing];
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 oa-squircle bg-background-secondary-default px-4 py-3 shadow-card">
      <StatusCopy className="text-text-primary">{message}</StatusCopy>
      {canRenew ? (
        <Button type="button" size="small" onClick={() => setOpen(true)}>
          {formatMessage({ id: "feature.mesh.terms.renew", defaultMessage: "Renew terms" })}
        </Button>
      ) : null}
      <RenewTermsDialog
        open={open}
        kind="mesh"
        acceptLabel={formatMessage({ id: "feature.mesh.renew.accept", defaultMessage: "Renew {mesh}" }, { mesh: meshTitle(mesh) })}
        pending={renew.isPending}
        error={renew.error}
        onClose={() => {
          renew.reset();
          setOpen(false);
        }}
        onAccepted={(acceptance) =>
          renew.mutate({
            meshId: mesh.id,
            data: { terms_version: acceptance.version, terms_locale: acceptance.locale },
          })
        }
      />
    </div>
  );
}
