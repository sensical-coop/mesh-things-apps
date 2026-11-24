import { createQueryClient } from "@mtt/contracts/query-client";
import { AppProviders } from "@mtt/ui/components/app-providers";
import { TooltipProvider } from "@mtt/ui/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Layout } from "./layout";
import { router } from "@/router/app-router";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import "./styles.css";

const queryClient = createQueryClient();
const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProviders messages={{ en, es }}>
        <TooltipProvider>
          <Layout router={router} />
        </TooltipProvider>
      </AppProviders>
    </QueryClientProvider>
  </StrictMode>,
);
