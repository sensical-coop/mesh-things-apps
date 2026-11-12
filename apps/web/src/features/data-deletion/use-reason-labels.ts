import type { DataDeletion } from "@mtt/contracts";
import { useMemo } from "react";
import { useIntl } from "react-intl";

export function useDataDeletionReasonLabels(): Record<DataDeletion["reason"], string> {
  const { formatMessage } = useIntl();
  return useMemo(
    () => ({
      mesh_deleted: formatMessage({ id: "page.dataDeletions.reason.meshDeleted", defaultMessage: "Mesh deleted" }),
      source_detached: formatMessage({ id: "page.dataDeletions.reason.sourceDetached", defaultMessage: "Moved off its source" }),
      terms_lapsed: formatMessage({ id: "page.dataDeletions.reason.termsLapsed", defaultMessage: "Terms lapsed" }),
    }),
    [formatMessage],
  );
}
