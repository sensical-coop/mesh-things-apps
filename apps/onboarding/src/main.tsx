import { setApiBaseUrl } from "@mtt/contracts/runtime";
import { createQueryClient } from "@mtt/contracts/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders } from "@mtt/ui/components/app-providers";
import { authRepository } from "@/features/auth/repository";
import { API_URL } from "@/lib/api-url";
import { MESSAGES } from "@/lib/messages";
import { StartPage } from "@/steps/page";
import "@/styles.css";

setApiBaseUrl(API_URL);
void authRepository.csrf().catch(() => {});

const queryClient = createQueryClient();

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProviders messages={MESSAGES}>
        <StartPage />
      </AppProviders>
    </QueryClientProvider>
  </StrictMode>,
);
