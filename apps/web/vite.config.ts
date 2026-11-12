import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { request } from "node:http";
import { DEV_PORTS, SITE_PATHS } from "@mtt/contracts/site";
import { initScriptsPlugin } from "@mtt/ui/init-scripts";
import { defineConfig, type Plugin } from "vite";

// Production serves /docs and /start from their apps through Caddy. In dev the same paths
// are piped here, ahead of Nitro, which would otherwise answer with the web SPA.
// A bare prefix (`/start`, `/start?…`) is forwarded with the trailing slash those apps use.
function proxyPrefixes(routes: { prefix: string; target: string }[]): Plugin {
  return {
    name: "proxy-prefixes",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        const path = url.split("?")[0] ?? "";
        const route = routes.find((item) => path === item.prefix || path.startsWith(`${item.prefix}/`));
        if (!route) return next();
        const upstreamUrl = path === route.prefix ? `${route.prefix}/${url.slice(route.prefix.length)}` : url;
        const upstream = request(
          new URL(upstreamUrl, route.target),
          { method: req.method, headers: req.headers },
          (response) => {
            res.writeHead(response.statusCode ?? 502, response.headers);
            response.pipe(res);
          },
        );
        upstream.on("error", next);
        req.pipe(upstream);
      });
    },
  };
}

export default defineConfig({
  envDir: "../..",
  nitro: {
    // ponytail: Nitro does not scan routes until serverDir is set.
    serverDir: "server",
  },
  server: {
    port: DEV_PORTS.web,
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
  worker: { format: "es" },
  // ponytail: SPA + Nitro node_server, not TanStack Start. Start if we need SSR/server fns.
  // The dev compose overlay runs the docs server in another container.
  plugins: [
    proxyPrefixes([
      { prefix: SITE_PATHS.docs, target: process.env.DOCS_DEV_URL ?? `http://127.0.0.1:${DEV_PORTS.docs}` },
      { prefix: SITE_PATHS.start, target: process.env.ONBOARDING_DEV_URL ?? `http://127.0.0.1:${DEV_PORTS.onboarding}` },
    ]),
    nitro(),
    react(),
    tailwindcss(),
    initScriptsPlugin(),
  ],
});
