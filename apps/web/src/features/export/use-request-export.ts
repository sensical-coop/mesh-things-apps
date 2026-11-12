import type { Export, ExportRequest } from "@mtt/contracts";
import { isThrottled, readApiError } from "@mtt/contracts/errors";
import { requestOf } from "./model.ts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { isExportStorageMissing } from "./storage-missing.ts";
import { exportRepository } from "./repository.ts";

export type RequestExportState = {
  request: (meshId: string, body: ExportRequest) => void;
  /** Asks again for what a past download was. */
  requestAgain: (row: Export) => void;
  pending: boolean;
  /** The export the last request created or found already building. */
  created: Export | undefined;
  /** Why the last request was refused, in the user's language where we know the reason. */
  error: string | undefined;
  /** Whether the refusal was the one-at-a-time limit. */
  busy: boolean;
  reset: () => void;
};

export function useRequestExport(onCreated?: (row: Export) => void): RequestExportState {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    ...exportRepository.create(),
    onSuccess: async (row) => {
      onCreated?.(row);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: exportRepository.listKey() }),
        queryClient.invalidateQueries({ queryKey: exportRepository.meshListKey(row.mesh_id) }),
      ]);
    },
  });

  const refusal = mutation.isError ? readApiError(mutation.error) : undefined;
  const busy = isThrottled(refusal?.status);
  let error: string | undefined;
  if (refusal) {
    if (busy) {
      error = formatMessage({
        id: "feature.export.error.busy",
        defaultMessage: "You already have a download being prepared. Request this one once it's ready.",
      });
    } else if (isExportStorageMissing(mutation.error)) {
      error = formatMessage({
        id: "feature.export.error.unavailable",
        defaultMessage: "This instance doesn't offer downloads. Ask the administrator to set up object storage.",
      });
    } else {
      error =
        Object.values(refusal.fields).join(" ") ||
        refusal.detail ||
        formatMessage({ id: "feature.export.error.generic", defaultMessage: "The download couldn't be requested. Try again." });
    }
  }

  const request = (meshId: string, body: ExportRequest) => mutation.mutate({ meshId, data: body });

  return {
    request,
    requestAgain: (row) => request(row.mesh_id, requestOf(row)),
    pending: mutation.isPending,
    created: mutation.data,
    error,
    busy,
    reset: mutation.reset,
  };
}
