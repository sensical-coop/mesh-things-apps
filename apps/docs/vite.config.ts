import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// `base` is both the asset prefix and the TanStack router basepath.
// File routes stay root-relative (`/overview` → `/docs/overview`) so the prefix is applied once.
// Nitro otherwise publishes the client build at `/assets`, which on this host belongs to apps/web.
export default defineConfig({
  base: "/docs/",
  server: { port: 5175, strictPort: true },
  resolve: {
    alias: { "@": `${import.meta.dirname}/src` },
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  plugins: [
    fumadocsMdx(),
    tailwindcss(),
    tanstackStart(),
    react(),
    nitro({ baseURL: "/docs" }),
  ],
});
