import { useMemo } from "react";
import { defineMessages, useIntl } from "react-intl";
import { SHOWN_MESH_STATUSES, type ShownMeshStatus } from "@/features/mesh/model";

const MESH_STATUS_LABELS = defineMessages({
  active: { id: "feature.mesh.status.active", defaultMessage: "Active" },
  renewSoon: { id: "feature.mesh.status.renewSoon", defaultMessage: "Renew soon" },
  termsChanged: { id: "feature.mesh.status.termsChanged", defaultMessage: "Terms changed" },
  termsNotAccepted: { id: "feature.mesh.status.termsNotAccepted", defaultMessage: "Terms not accepted" },
  scheduledForDeletion: { id: "feature.mesh.status.scheduledForDeletion", defaultMessage: "Scheduled for deletion" },
  sourcePaused: { id: "feature.mesh.status.sourcePaused", defaultMessage: "Source paused" },
  sourceDisconnected: { id: "feature.mesh.status.sourceDisconnected", defaultMessage: "Source disconnected" },
  sourceUnknown: { id: "feature.mesh.status.sourceUnknown", defaultMessage: "Source status unknown" },
} satisfies Record<ShownMeshStatus, { id: string; defaultMessage: string }>);

/** Each shown mesh status named, and as options in the menu order. */
export function useMeshStatusLabels(): {
  labels: Record<ShownMeshStatus, string>;
  options: { value: ShownMeshStatus; label: string }[];
} {
  const { formatMessage } = useIntl();
  return useMemo(() => {
    const labels = Object.fromEntries(
      SHOWN_MESH_STATUSES.map((kind) => [kind, formatMessage(MESH_STATUS_LABELS[kind])]),
    ) as Record<ShownMeshStatus, string>;
    return { labels, options: SHOWN_MESH_STATUSES.map((kind) => ({ value: kind, label: labels[kind] })) };
  }, [formatMessage]);
}
