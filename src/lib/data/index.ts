/**
 * The single place that chooses which backend the app talks to.
 *
 * The choice is automatic and env-driven:
 *  - Supabase env vars present  → `supabaseStore` (Phase 2+)
 *  - otherwise                  → `localStore`    (Phase 1 / offline demo)
 *
 * Everything else in the app imports `store` / `backendKind` from here and is
 * unaffected by the swap. To force local even when Supabase is configured, set
 * NEXT_PUBLIC_FORCE_LOCAL_STORE=1.
 */
import { isSupabaseConfigured } from "../supabase/client";
import { localStore } from "./localStore";
import { supabaseStore } from "./supabaseStore";
import type { Store } from "./store";

const forceLocal = process.env.NEXT_PUBLIC_FORCE_LOCAL_STORE === "1";
const useSupabase = !forceLocal && isSupabaseConfigured();

export const backendKind: "supabase" | "local" = useSupabase ? "supabase" : "local";
export const store: Store = useSupabase ? supabaseStore : localStore;

export type { Store, ItemFilter } from "./store";
