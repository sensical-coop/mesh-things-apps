export const THEME_STORAGE_KEY = "boardui:theme";
export const THEME_EVENT = "boardui-theme";

export const THEMES = {
  light: "light",
  dark: "dark",
} as const;

export type Theme = (typeof THEMES)[keyof typeof THEMES];

/** ponytail: OA body is white; first visit stays light. Toggle still persists. */
const DEFAULT_THEME: Theme = THEMES.light;

// Serialized into themeInitScript: must not reference anything outside its own body.
function initTheme(storageKey: string, fallback: string, dark: string): void {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(storageKey);
  } catch {
    /* private mode */
  }
  document.documentElement.classList.toggle("dark", (stored ?? fallback) === dark);
}

export const themeInitScript = `(${initTheme})(${[THEME_STORAGE_KEY, DEFAULT_THEME, THEMES.dark].map((arg) => JSON.stringify(arg)).join(",")});`;

function applyTheme(theme: Theme): void {
  const root = globalThis.document?.documentElement;
  if (!root) return;
  root.classList.toggle("dark", theme === THEMES.dark);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode */
  }
  globalThis.dispatchEvent(new Event(THEME_EVENT));
}

export function getTheme(): Theme {
  const root = globalThis.document?.documentElement;
  if (!root) return DEFAULT_THEME;
  return root.classList.contains("dark") ? THEMES.dark : THEMES.light;
}

export function toggleTheme(): Theme {
  const next = getTheme() === THEMES.dark ? THEMES.light : THEMES.dark;
  applyTheme(next);
  return next;
}
