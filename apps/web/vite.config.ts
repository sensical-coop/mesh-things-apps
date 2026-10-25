import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv, type Plugin } from "vite";

// The public site's /docs is a redirect to the docs app root. Same in local dev.
function redirectDocs(docsUrl: string): Plugin {
  const origin = docsUrl.replace(/\/$/, "");
  return {
    name: "redirect-docs",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.url ?? "";
        const path = raw.split("?")[0] ?? "";
        if (path !== "/docs" && !path.startsWith("/docs/")) return next();
        const rest = path.slice("/docs".length) || "/";
        const query = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
        res.statusCode = 302;
        res.setHeader("Location", `${origin}${rest}${query}`);
        res.end();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, `${import.meta.dirname}/../..`, "");
  return {
  // Repo-root .env (also read by docker-compose) drives local dev too, so
  // VITE_API_URL / VITE_DISABLE_MOCK_API only need to be set in one place.
  envDir: "../..",
  nitro: {
    // ponytail: Nitro does not scan routes until serverDir is set.
    serverDir: "server",
  },
  server: {
    port: 5173,
  },
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
  plugins: [redirectDocs(env.DOCS_URL || "http://127.0.0.1:5175"), nitro(), react(), tailwindcss()],
  };
});
