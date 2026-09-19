import { client } from "@mtt/contracts/client";
import { attachCsrfHeader } from "@mtt/contracts/runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TooltipProvider } from "@mtt/ui/components/ui/tooltip";
import { Layout } from "./layout";
import { authRepository } from "@/features/auth/repository";
import { router } from "@/router/app-router";
import "./styles.css";

client.setConfig({
  baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8787",
  credentials: "include",
});
client.interceptors.request.use(attachCsrfHeader);
// csrftoken cookie for a returning user with valid session
void authRepository.csrf().catch(() => {});

const queryClient = new QueryClient();
const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Layout router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
