"use client";

import * as React from "react";

export type Theme = "light" | "dark";
const THEME_KEY = "minion-brain:theme";

function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Reads/sets the dark-mode class on <html>. The initial class is applied by the
 * inline script in layout.tsx (no flash); this hook just toggles and persists.
 */
export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>(currentTheme);

  const toggle = React.useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
