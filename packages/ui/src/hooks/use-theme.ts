import { getTheme, THEME_EVENT, type Theme } from "@mtt/ui/theme";
import { useSyncExternalStore } from "react";

function subscribeTheme(onStoreChange: () => void): () => void {
  globalThis.addEventListener(THEME_EVENT, onStoreChange);
  return () => globalThis.removeEventListener(THEME_EVENT, onStoreChange);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, getTheme, getTheme);
}
