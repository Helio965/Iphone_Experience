"use client";

import { useSyncExternalStore } from "react";

/** SSR-safe media query subscription (returns `fallback` on the server). */
export function useMediaQuery(query: string, fallback = false) {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
