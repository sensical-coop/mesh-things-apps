import { useSyncExternalStore } from "react";
import { getLocale, LOCALE_EVENT, type Locale, setLocale } from "@/lib/locale";

function subscribeLocale(onStoreChange: () => void): () => void {
  globalThis.addEventListener(LOCALE_EVENT, onStoreChange);
  return () => globalThis.removeEventListener(LOCALE_EVENT, onStoreChange);
}

export function useLocale(): [Locale, (locale: Locale) => void] {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getLocale);
  return [locale, setLocale];
}
