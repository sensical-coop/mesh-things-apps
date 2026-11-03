import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { request } from "node:http";
import { defineConfig, type Plugin } from "vite";

// Production serves /docs from the docs app through Caddy. In dev the same path is piped to
// the docs dev server here, ahead of Nitro, which would otherwise answer with the SPA.
function proxyDocs(target: string): Plugin {
  return {
    name: "proxy-docs",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (url !== "/docs" && !url.startsWith("/docs/") && !url.startsWith("/docs?")) return next();
        const upstream = request(new URL(url, target), { method: req.method, headers: req.headers }, (response) => {
          res.writeHead(response.statusCode ?? 502, response.headers);
          response.pipe(res);
        });
        upstream.on("error", next);
        req.pipe(upstream);
      });
    },
  };
}

export default defineConfig({
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
  // The dev compose overlay runs the docs server in another container.
  plugins: [proxyDocs(process.env.DOCS_DEV_URL ?? "http://127.0.0.1:5175"), nitro(), react(), tailwindcss()],
});
