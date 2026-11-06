import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { localeInitScript } from "@mtt/ui/locale";
import { themeInitScript } from "@mtt/ui/theme";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/start/",
  envDir: "../..",
  server: {
    host: "127.0.0.1",
    port: 5176,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": `${import.meta.dirname}/src`,
    },
    dedupe: ["react", "react-dom"],
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "init-scripts",
      transformIndexHtml: () =>
        [themeInitScript, localeInitScript].map((children) => ({ tag: "script", children, injectTo: "head" as const })),
    },
  ],
});
