import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { request } from "node:http";
import { request as httpsRequest } from "node:https";
import { defineConfig, loadEnv, type Plugin } from "vite";

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

// `pnpm dev:remote` (.env.remote: API_PROXY_TARGET + VITE_API_URL=/remote-api) runs against a deployed
// API. The browser stays on one origin, so the API's SameSite=Lax cookies and CORS allowlist don't need
// to know about localhost. A middleware like proxyDocs, since server.proxy runs after Nitro's SPA fallback.
function proxyRemoteApi(): Plugin {
  return {
    name: "proxy-remote-api",
    configureServer(server) {
      const target = loadEnv(server.config.mode, server.config.envDir || process.cwd(), "").API_PROXY_TARGET;
      if (!target) return;
      const { origin, host, hostname, port, protocol } = new URL(target);
      const send = protocol === "https:" ? httpsRequest : request;
      // connect strips the /remote-api mount from req.url
      server.middlewares.use("/remote-api", (req, res, next) => {
        // Django's CSRF check compares Origin with the API host.
        const headers = { ...req.headers, host, origin, referer: `${origin}/` };
        // A path, never a URL: `new URL("//evil.example/x", origin)` would leave the target host.
        const options = { protocol, hostname, port, path: req.url, method: req.method, headers };
        const upstream = send(options, (response) => {
          // Session and CSRF cookies come scoped to the API's domain (e.g. .sensical.es); keep them on localhost.
          const cookies = response.headers["set-cookie"];
          if (cookies) response.headers["set-cookie"] = cookies.map((c) => c.replace(/;\s*domain=[^;]*/i, ""));
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
  plugins: [
    proxyDocs(process.env.DOCS_DEV_URL ?? "http://127.0.0.1:5175"),
    proxyRemoteApi(),
    nitro(),
    react(),
    tailwindcss(),
  ],
});
