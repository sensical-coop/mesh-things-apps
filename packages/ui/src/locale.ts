export const LOCALE_STORAGE_KEY = "mtt:locale";
export const LOCALE_EVENT = "mtt-locale";

export const SUPPORTED_LOCALES = ["en", "es"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

// Serialized into localeInitScript: must not reference anything outside its own body.
function detectLocale(storageKey: string, supported: readonly string[], fallback: string): string {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored && supported.includes(stored)) return stored;
  } catch {
    /* private mode */
  }
  const nav = globalThis.navigator;
  for (const candidate of nav?.languages ?? [nav?.language]) {
    const prefix = (candidate ?? "").split("-")[0] ?? "";
    if (supported.includes(prefix)) return prefix;
  }
  return fallback;
}

const DETECT_ARGS = [LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, DEFAULT_LOCALE] as const;

export function detectInitialLocale(): Locale {
  return detectLocale(...DETECT_ARGS) as Locale;
}

export const localeInitScript = `document.documentElement.lang=(${detectLocale})(${DETECT_ARGS.map((arg) => JSON.stringify(arg)).join(",")});`;

export function setLocale(locale: Locale): void {
  const root = globalThis.document?.documentElement;
  if (root) root.lang = locale;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode */
  }
  globalThis.dispatchEvent(new Event(LOCALE_EVENT));
}

// <html lang> is the live source: the init script and setLocale setLocale write it, even when storage is blocked.
export function getLocale(): Locale {
  const lang = globalThis.document?.documentElement.lang;
  return (SUPPORTED_LOCALES as readonly string[]).includes(lang) ? (lang as Locale) : detectInitialLocale();
}
