import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { initScriptsPlugin } from "@mtt/ui/init-scripts";
import { DEV_PORTS, SITE_PATHS } from "@mtt/contracts/site";
import { defineConfig } from "vite";

export default defineConfig({
  base: `${SITE_PATHS.start}/`,
  envDir: "../..",
  server: {
    host: "127.0.0.1",
    port: DEV_PORTS.onboarding,
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
    initScriptsPlugin(),
  ],
});
