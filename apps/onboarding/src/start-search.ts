import { useSyncExternalStore } from "react";
import { isStartStep, type StartStep } from "@/start-step";

export type StartSearch = { mesh?: string; step?: StartStep };

const EMPTY: StartSearch = {};

function parse(): StartSearch {
  const params = new URLSearchParams(window.location.search);
  const mesh = params.get("mesh");
  const step = params.get("step");
  return {
    mesh: mesh ? mesh : undefined,
    step: isStartStep(step) ? step : undefined,
  };
}

let snapshot: StartSearch = typeof window === "undefined" ? EMPTY : parse();
const listeners = new Set<() => void>();

function publish(): void {
  const next = parse();
  if (next.mesh === snapshot.mesh && next.step === snapshot.step) return;
  snapshot = next;
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") window.addEventListener("popstate", publish);

export function writeStartSearch(search: StartSearch, mode: "push" | "replace"): void {
  const params = new URLSearchParams();
  if (search.mesh) params.set("mesh", search.mesh);
  if (search.step) params.set("step", search.step);
  const qs = params.toString();
  const url = `${import.meta.env.BASE_URL}${qs ? `?${qs}` : ""}`;
  if (url === `${window.location.pathname}${window.location.search}`) return;
  if (mode === "replace") history.replaceState(null, "", url);
  else history.pushState(null, "", url);
  publish();
}

export function useStartSearch(): StartSearch {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => snapshot,
    () => EMPTY,
  );
}
