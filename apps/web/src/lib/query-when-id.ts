import { skipToken, type QueryKey } from "@tanstack/react-query";

/** Skip the request when the id is missing, instead of calling the API with a fake id. */
export function whenId<T extends { queryKey: QueryKey }>(
  id: string | null | undefined,
  idleKey: QueryKey,
  options: (id: string) => T,
): T | { queryKey: QueryKey; queryFn: typeof skipToken } {
  if (!id) return { queryKey: idleKey, queryFn: skipToken };
  return options(id);
}
