import type { Mesh } from "@mtt/contracts";
import { Button } from "@mtt/ui/components/base/buttons/button";
import { type ReactElement, useState } from "react";
import { useIntl } from "react-intl";
import { StatusCopy } from "@/components/status-copy";
import type { TermsStanding } from "@/features/terms/model";
import { RenewMeshTermsDialog } from "@/features/mesh/ui/renew-mesh-terms-dialog";
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
  const [open, setOpen] = useState(false);
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
    <div className="oa-squircle mb-6 flex flex-wrap items-center justify-between gap-3 bg-background-secondary-default px-4 py-3 shadow-card">
      <StatusCopy className="text-text-primary">{message}</StatusCopy>
      {canRenew ? (
        <Button type="button" size="small" onClick={() => setOpen(true)}>
          {formatMessage({ id: "feature.mesh.terms.renew", defaultMessage: "Renew terms" })}
        </Button>
      ) : null}
      <RenewMeshTermsDialog mesh={open ? mesh : null} onClose={() => setOpen(false)} />
    </div>
  );
}
