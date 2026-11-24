import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { DEV_PORTS, SITE_PATHS } from "@mtt/contracts/site";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// `base` is both the asset prefix and the TanStack router basepath.
// File routes stay root-relative (`/overview` → `/docs/overview`) so the prefix is applied once.
// Nitro otherwise publishes the client build at `/assets`, which on this host belongs to apps/web.
// Repo-root .env supplies VITE_WEB_URL, same file docker-compose reads.
export default defineConfig({
  base: `${SITE_PATHS.docs}/`,
  envDir: "../..",
  // Pages reached through the web dev server's /docs still open their reload socket here,
  // since that server only forwards plain HTTP.
  server: { host: "127.0.0.1", port: DEV_PORTS.docs, strictPort: true, hmr: { clientPort: DEV_PORTS.docs } },
  resolve: {
    alias: { "@": `${import.meta.dirname}/src` },
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  plugins: [fumadocsMdx(), tailwindcss(), tanstackStart(), react(), nitro({ baseURL: SITE_PATHS.docs })],
});
