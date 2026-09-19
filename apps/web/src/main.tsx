import { client } from "@mtt/contracts/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TooltipProvider } from "@mtt/ui/components/ui/tooltip";
import { AppProviders } from "./app-providers";
import { Layout } from "./layout";
import { router } from "@/router/app-router";
import "./styles.css";

client.setConfig({
  baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8787",
  credentials: "include",
});

const queryClient = new QueryClient();
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
