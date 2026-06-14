"use client";

import * as React from "react";

/**
 * Returns false during SSR and the first client render, then true after mount.
 * Use to gate client-only UI (e.g. things that depend on localStorage, the DOM,
 * or browser feature detection) so the first client render matches the server
 * and React doesn't report a hydration mismatch.
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    () => () => {},
    () => true, // client snapshot
    () => false, // server snapshot
  );
}
