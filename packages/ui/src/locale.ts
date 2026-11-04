export const LOCALE_STORAGE_KEY = "mtt:locale";
export const LOCALE_EVENT = "mtt-locale";

export const SUPPORTED_LOCALES = ["en", "es"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

function isSupportedLocale(value: string | null | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

function matchNavigatorLocale(): Locale | null {
  const candidates = globalThis.navigator?.languages ?? [globalThis.navigator?.language].filter(Boolean);
  for (const candidate of candidates) {
    const prefix = candidate.split("-")[0];
    if (isSupportedLocale(prefix)) return prefix;
  }
  return null;
}

export function readStoredLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isSupportedLocale(stored)) return stored;
  } catch {
    return null;
  }
  return null;
}

export function detectInitialLocale(): Locale {
  return readStoredLocale() ?? matchNavigatorLocale() ?? DEFAULT_LOCALE;
}

export const localeInitScript = [
  "(function(){try{",
  `var stored=localStorage.getItem("${LOCALE_STORAGE_KEY}");`,
  `var supported=${JSON.stringify(SUPPORTED_LOCALES)};`,
  "var lang=stored&&supported.indexOf(stored)>-1?stored:null;",
  "if(!lang){",
  "var langs=navigator.languages||[navigator.language];",
  "for(var i=0;i<langs.length;i++){",
  "var prefix=(langs[i]||'').split('-')[0];",
  "if(supported.indexOf(prefix)>-1){lang=prefix;break;}",
  "}",
  "}",
  `document.documentElement.lang=lang||"${DEFAULT_LOCALE}";`,
  "}catch(e){",
  `document.documentElement.lang="${DEFAULT_LOCALE}";`,
  "}})();",
].join("");

export function applyLocale(locale: Locale): void {
  const root = globalThis.document?.documentElement;
  if (root) root.lang = locale;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode */
  }
  globalThis.dispatchEvent(new Event(LOCALE_EVENT));
}

let currentLocale: Locale | null = null;

export function getLocale(): Locale {
  if (currentLocale) return currentLocale;
  currentLocale = detectInitialLocale();
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  applyLocale(locale);
}
