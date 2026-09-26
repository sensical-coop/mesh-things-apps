import { Chip } from "@mtt/ui/components/base/badges/chip";
import { type ReactElement } from "react";
import { useIntl } from "react-intl";
import type { MeshStatus } from "@/features/mesh/model";
import { useFormatters } from "@/hooks/use-formatters";

export type MeshStatusChipProps = {
  status: MeshStatus;
};

/** Lime when it's storing data, yellow when something needs doing soon, rose when it has stopped. */
export function MeshStatusChip({ status }: MeshStatusChipProps): ReactElement {
  const { formatMessage } = useIntl();
  const { formatWhen } = useFormatters();
  if (status.kind === "hidden") return <span className="text-text-tertiary">—</span>;
  const shown = {
    active: {
      color: "lime",
      label: formatMessage({ id: "feature.mesh.status.active", defaultMessage: "Active" }),
      title: formatMessage({ id: "feature.mesh.status.activeTitle", defaultMessage: "Storing data from its gateways." }),
    },
    renewSoon: {
      color: "yellow",
      label: formatMessage({ id: "feature.mesh.status.renewSoon", defaultMessage: "Renew soon" }),
      title:
        status.kind === "renewSoon"
          ? formatMessage(
              {
                id: "feature.mesh.status.renewSoonTitle",
                defaultMessage: "Its terms lapse on {when}. Renew them from the mesh page to keep storing data.",
              },
              { when: formatWhen(status.expiresAt) },
            )
          : "",
    },
    termsChanged: {
      color: "yellow",
      label: formatMessage({ id: "feature.mesh.status.termsChanged", defaultMessage: "Terms changed" }),
      title: formatMessage({
        id: "feature.mesh.status.termsChangedTitle",
        defaultMessage: "The mesh terms changed since they were accepted. Accept the new version from the mesh page.",
      }),
    },
    termsNotAccepted: {
      color: "neutral",
      label: formatMessage({ id: "feature.mesh.status.termsNotAccepted", defaultMessage: "Terms not accepted" }),
      title: formatMessage({
        id: "feature.mesh.status.termsNotAcceptedTitle",
        defaultMessage: "Still storing data. No terms are on record for this mesh; accept them from the mesh page.",
      }),
    },
    scheduledForDeletion: {
      color: "rose",
      label: formatMessage({ id: "feature.mesh.status.scheduledForDeletion", defaultMessage: "Scheduled for deletion" }),
      title: formatMessage({
        id: "feature.mesh.status.scheduledForDeletionTitle",
        defaultMessage:
          "Its terms lapsed, so it stopped storing data, and its readings will be deleted unless the terms are renewed.",
      }),
    },
    sourcePaused: {
      color: "rose",
      label: formatMessage({ id: "feature.mesh.status.sourcePaused", defaultMessage: "Source paused" }),
      title: formatMessage({
        id: "feature.mesh.status.sourcePausedTitle",
        defaultMessage: "Its source's terms lapsed, so nothing is bridged in until the source is renewed.",
      }),
    },
    sourceDisconnected: {
      color: "yellow",
      label: formatMessage({ id: "feature.mesh.status.sourceDisconnected", defaultMessage: "Source disconnected" }),
      title: formatMessage({
        id: "feature.mesh.status.sourceDisconnectedTitle",
        defaultMessage: "Its source's bridge can't reach the remote broker, so no traffic arrives for now.",
      }),
    },
    sourceUnknown: {
      color: "neutral",
      label: formatMessage({ id: "feature.mesh.status.sourceUnknown", defaultMessage: "Source status unknown" }),
      title: formatMessage({
        id: "feature.mesh.status.sourceUnknownTitle",
        defaultMessage: "The bridge's status couldn't be checked.",
      }),
    },
  } as const;
  const { color, label, title } = shown[status.kind];
  return (
    <Chip variant="caption" color={color} className="rounded-full whitespace-nowrap" title={title}>
      {label}
    </Chip>
  );
}
