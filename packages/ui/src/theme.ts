export const THEME_STORAGE_KEY = "boardui:theme";
export const THEME_EVENT = "boardui-theme";

export const THEMES = {
  light: "light",
  dark: "dark",
} as const;

export type Theme = (typeof THEMES)[keyof typeof THEMES];

/** ponytail: OA body is white; first visit stays light. Toggle still persists. */
export const DEFAULT_THEME: Theme = THEMES.light;

export const themeInitScript = [
  "(function(){try{",
  `var stored=localStorage.getItem("${THEME_STORAGE_KEY}");`,
  `var dark=stored?stored==="${THEMES.dark}":false;`,
  'document.documentElement.classList.toggle("dark",dark)',
  "}catch(e){",
  'document.documentElement.classList.remove("dark")',
  "}})();",
].join("");

export function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === THEMES.dark || stored === THEMES.light) return stored;
  } catch {
    return null;
  }
  return null;
}

export function applyTheme(theme: Theme): void {
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
