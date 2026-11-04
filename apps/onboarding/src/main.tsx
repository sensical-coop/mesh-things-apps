import { readApiError } from "@mtt/contracts/errors";
import { setApiBaseUrl } from "@mtt/contracts/runtime";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders } from "@/app-providers";
import { authRepository } from "@/features/auth/repository";
import { API_URL } from "@/lib/api-url";
import { StartPage } from "@/steps/page";
import "@/styles.css";

setApiBaseUrl(API_URL);
void authRepository.csrf().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const { status } = readApiError(error);
        return status !== 429 && status !== 404 && failureCount < 3;
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

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <StartPage />
      </AppProviders>
    </QueryClientProvider>
  </StrictMode>,
);
