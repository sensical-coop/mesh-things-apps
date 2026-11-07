import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { readApiError } from "./api-errors";

// A 4xx is about the request itself (signed out, forbidden, not found, rate limited):
// asking again won't change it, and a 429 retry only spends more of the limit.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          const { status } = readApiError(error);
          const clientError = status !== undefined && status >= 400 && status < 500;
          return !clientError && failureCount < 3;
        },
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => console.error(`Query failed: ${query.queryKey.join("/")}`, error),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) =>
        console.error(`Mutation failed: ${mutation.options.mutationKey?.join("/") ?? "unnamed"}`, error),
    }),
  });
}
