import { setApiBaseUrl } from "@mtt/contracts/runtime";
import { createQueryClient } from "@mtt/contracts/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders } from "@mtt/ui/components/app-providers";
import { TooltipProvider } from "@mtt/ui/components/ui/tooltip";
import { Layout } from "./layout";
import { authRepository } from "@/features/auth/repository";
import { router } from "@/router/app-router";
import { API_URL } from "@/lib/api-url";
import { MESSAGES } from "@/lib/messages";
import "./styles.css";

setApiBaseUrl(API_URL);
// csrftoken cookie for a returning user with valid session
void authRepository.csrf().catch(() => {});

const queryClient = createQueryClient();
const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProviders messages={MESSAGES}>
        <TooltipProvider>
          <Layout router={router} />
        </TooltipProvider>
      </AppProviders>
    </QueryClientProvider>
  </StrictMode>,
);
