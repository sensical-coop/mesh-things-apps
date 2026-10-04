import type { Export, ExportRequest } from "@mtt/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { readApiError } from "@/lib/api-errors";
import { exportRepository } from "@/features/export/repository";

export type RequestExportState = {
  request: (meshId: string, body: ExportRequest) => void;
  pending: boolean;
  /** The export the last request created or found already building. */
  created: Export | undefined;
  /** Why the last request was refused, in the user's language where we know the reason. */
  error: string | undefined;
  /** Whether the refusal was the one-at-a-time limit. */
  busy: boolean;
  reset: () => void;
};

/** Ask for an export and keep every list of exports in step with it. */
export function useRequestExport(onCreated?: (row: Export) => void): RequestExportState {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    ...exportRepository.create(),
    onSuccess: async (row) => {
      onCreated?.(row);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: exportRepository.listKey() }),
        queryClient.invalidateQueries({ queryKey: exportRepository.meshListKey({ path: { mesh_id: row.mesh_id } }) }),
      ]);
    },
  });

  const refusal = mutation.error ? readApiError(mutation.error) : undefined;
  const busy = refusal?.status === 429;
  let error: string | undefined;
  if (refusal) {
    if (busy) {
      error = formatMessage({
        id: "feature.export.error.busy",
        defaultMessage: "You already have a download being prepared. Request this one once it's ready.",
      });
    } else if (refusal.status === 404 && refusal.detail === "Not found") {
      error = formatMessage({
        id: "feature.export.error.unavailable",
        defaultMessage: "This instance doesn't offer downloads. Ask the administrator to set up object storage.",
      });
    } else {
      error =
        Object.values(refusal.fields)[0] ??
        refusal.detail ??
        formatMessage({ id: "feature.export.error.generic", defaultMessage: "The download couldn't be requested. Try again." });
    }
  }

  return {
    request: (meshId, body) => mutation.mutate({ path: { mesh_id: meshId }, body }),
    pending: mutation.isPending,
    created: mutation.data,
    error,
    busy,
    reset: mutation.reset,
  };
}
