import { client } from "@mtt/contracts/client";
import { attachCsrfHeader, attachErrorStatus } from "@mtt/contracts/runtime";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TooltipProvider } from "@mtt/ui/components/ui/tooltip";
import { AppProviders } from "./app-providers";
import { Layout } from "./layout";
import { authRepository } from "@/features/auth/repository";
import { router } from "@/router/app-router";
import { API_URL } from "@/lib/api-url";
import { readApiError } from "@/lib/api-errors";
import "./styles.css";

client.setConfig({
  baseUrl: API_URL,
  credentials: "include",
});
client.interceptors.request.use(attachCsrfHeader);
client.interceptors.error.use(attachErrorStatus);
// csrftoken cookie for a returning user with valid session
void authRepository.csrf().catch(() => {});

const queryClient = new QueryClient({
  // Data a page just loaded counts as fresh for a while, so moving between pages, or
  // back to the tab, doesn't refetch it. Mutations still invalidate what they change.
  // A 429 means the account is over the API's rate limit; retrying only spends more of it.
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => readApiError(error).status !== 429 && failureCount < 3,
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
        <TooltipProvider>
          <Layout router={router} />
        </TooltipProvider>
      </AppProviders>
    </QueryClientProvider>
  </StrictMode>,
);
