import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5173 },
  resolve: {
    alias: {
      "@": `${import.meta.dirname}/src`,
    },
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  optimizeDeps: {
    include: ["cobe"],
  },
  // ponytail: SPA + Nitro node_server, not TanStack Start. Start if we need SSR/server fns.
  plugins: [nitro(), react(), tailwindcss()],
});
