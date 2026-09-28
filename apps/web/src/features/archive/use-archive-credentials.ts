import type { ArchiveCredentials } from "@mtt/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useIntl } from "react-intl";
import { readApiError } from "@/lib/api-errors";
import { archiveRepository } from "@/features/archive/repository";

export type ArchiveCredentialsState = {
  /** Null until issued for this mesh. The secret is never fetched again. */
  credentials: ArchiveCredentials | null;
  issue: () => void;
  pending: boolean;
  error: string | null;
};

/** One set of temporary credentials per mesh, shared by everything on the page that needs them. */
export function useArchiveCredentials(meshId: string | undefined): ArchiveCredentialsState {
  const { formatMessage } = useIntl();
  const [issued, setIssued] = useState<{ meshId: string; credentials: ArchiveCredentials } | null>(null);
  const [failure, setFailure] = useState<{ meshId: string; message: string } | null>(null);
  const mutation = useMutation({
    ...archiveRepository.credentials(),
    onSuccess: (credentials, variables) => {
      setFailure(null);
      setIssued({ meshId: variables.path.mesh_id, credentials });
    },
    onError: (error, variables) => {
      const { status, detail } = readApiError(error);
      setFailure({
        meshId: variables.path.mesh_id,
        message:
          status === 404
            ? formatMessage({
                id: "feature.archive.connect.noCredentials",
                defaultMessage: "This instance's storage doesn't issue credentials. Download the files above instead.",
              })
            : formatMessage({ id: "feature.archive.connect.error", defaultMessage: "Credentials weren't issued." }) +
              (detail ? ` ${detail}` : ""),
      });
    },
  });
  return {
    credentials: issued && issued.meshId === meshId ? issued.credentials : null,
    issue: () => {
      if (meshId) mutation.mutate({ path: { mesh_id: meshId } });
    },
    pending: mutation.isPending,
    error: failure && failure.meshId === meshId ? failure.message : null,
  };
}
