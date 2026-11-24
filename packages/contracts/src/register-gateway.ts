import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formLevelMessage, issueErrors, readApiError } from "./api-errors";
import {
  getDevicesCreateMutationOptions,
  getDevicesListQueryKey,
  getMeshesDevicesListQueryKey,
} from "./generated/api";
import { DeviceCreate } from "./generated/model.zod";

/** Registers `meshId`'s gateway: body, field errors, and the device caches refreshed before `onRegistered`. */
export function useRegisterGateway(meshId: string, onRegistered?: () => Promise<void> | void) {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useMutation({
    ...getDevicesCreateMutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getDevicesListQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getMeshesDevicesListQueryKey(meshId) });
      await onRegistered?.();
    },
    onError: (error) => setErrors(readApiError(error).fields),
  });

  function submit(values: { node_id: number; label: string | null }) {
    const parsed = DeviceCreate.safeParse({ mesh_id: meshId, is_gateway: true, ...values });
    if (!parsed.success) {
      setErrors(issueErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    create.mutate({ data: parsed.data });
  }

  return {
    errors,
    pending: create.isPending,
    failed: create.error != null,
    alertDetail: formLevelMessage(create.error),
    submit,
  };
}
