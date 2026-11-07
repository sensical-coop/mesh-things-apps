import { createQueryClient } from "@mtt/contracts/query-client";
import { AppProviders } from "@mtt/ui/components/app-providers";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import { StartPage } from "@/steps/page";
import "@/styles.css";

const queryClient = createQueryClient();

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProviders messages={{ en, es }}>
        <StartPage />
      </AppProviders>
    </QueryClientProvider>
  </StrictMode>,
);
