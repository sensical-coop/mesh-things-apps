import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useIntl } from "react-intl";
import { authRepository } from "@/features/auth/repository";
import { useMe } from "@/features/auth/use-me";

/**
 * Every owner's name, for views that show who owns something. Fetches the whole
 * directory, so don't use it when names aren't shown.
 */
export function useOwnerDirectory(): {
  ownerName: (ownerId: string) => string;
  /** `ownerName`, marked "(me)" for the signed-in owner. */
  ownerLabel: (ownerId: string) => string;
} {
  const { formatMessage } = useIntl();
  const { me, meId } = useMe();
  // The directory (id + name) is readable by every verified owner, and now that
  // public meshes show up in lists, everyone needs names for them.
  const owners = useQuery({ ...authRepository.list(), enabled: me != null });
  const namesById = useMemo(() => new Map((owners.data ?? []).map((owner) => [owner.id, owner.name])), [owners.data]);
  const ownerName = useCallback((ownerId: string) => namesById.get(ownerId) ?? ownerId, [namesById]);
  const ownerLabel = useCallback(
    (ownerId: string) =>
      ownerId === meId
        ? formatMessage({ id: "common.ownerColumn.me", defaultMessage: "{name} (me)" }, { name: ownerName(ownerId) })
        : ownerName(ownerId),
    [meId, ownerName, formatMessage],
  );

  return { ownerName, ownerLabel };
}
