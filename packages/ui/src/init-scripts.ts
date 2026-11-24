// Vite configs load this through Node, which needs explicit extensions.
import { localeInitScript } from "./locale.ts";
import { themeInitScript } from "./theme.ts";

/** Head scripts that set theme and locale before paint. Docs SSR inlines these; the Vite apps inject them. */
export const headInitScripts = [themeInitScript, localeInitScript];

export function initScriptsPlugin() {
  return {
    name: "init-scripts",
    transformIndexHtml: () =>
      headInitScripts.map((children) => ({ tag: "script" as const, children, injectTo: "head" as const })),
  };
}
