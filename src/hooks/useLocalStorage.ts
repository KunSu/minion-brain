"use client";

import * as React from "react";

/**
 * A persisted state value backed by localStorage, built on useSyncExternalStore
 * so it is hydration-safe: the server snapshot is the provided default, and React
 * reconciles the client value after hydration WITHOUT a mismatch warning. Also
 * syncs across tabs via the `storage` event.
 */
export function useLocalStorage<T extends string>(
  key: string,
  fallback: T,
  isValid: (v: string) => v is T,
): [T, (next: T) => void] {
  const subscribe = React.useCallback((onChange: () => void) => {
    const handler = (e: StorageEvent) => {
      if (e.key === key) onChange();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [key]);

  const getSnapshot = React.useCallback((): T => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw && isValid(raw) ? raw : fallback;
    } catch {
      return fallback;
    }
  }, [key, fallback, isValid]);

  const value = React.useSyncExternalStore(subscribe, getSnapshot, () => fallback);

  const set = React.useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, next);
        // Notify same-tab subscribers (storage event only fires cross-tab).
        window.dispatchEvent(new StorageEvent("storage", { key }));
      } catch {
        // ignore storage failures
      }
    },
    [key],
  );

  return [value, set];
}
