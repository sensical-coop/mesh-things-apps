import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// The app is rooted at /. The public site redirects its own /docs to this origin.
// Repo-root .env supplies VITE_WEB_URL, same file docker-compose reads.
export default defineConfig({
  envDir: "../..",
  server: { port: 5175, strictPort: true },
  resolve: {
    alias: { "@": `${import.meta.dirname}/src` },
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  plugins: [fumadocsMdx(), tailwindcss(), tanstackStart(), react(), nitro()],
});
