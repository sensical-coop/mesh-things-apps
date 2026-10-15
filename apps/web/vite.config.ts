import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { defineConfig } from "vite";

export default defineConfig({
  // Repo-root .env (also read by docker-compose) drives local dev too, so
  // VITE_API_URL / VITE_DISABLE_MOCK_API only need to be set in one place.
  envDir: "../..",
  nitro: {
    // ponytail: Nitro does not scan routes until serverDir is set.
    serverDir: "server",
  },
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
  // MapLibre starts its worker as a module worker, from the app's own bundle.
  worker: { format: "es" },
  // ponytail: SPA + Nitro node_server, not TanStack Start. Start if we need SSR/server fns.
  plugins: [fumadocsMdx(), nitro(), react(), tailwindcss()],
});
