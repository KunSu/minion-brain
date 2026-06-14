/**
 * Shared Supabase client for Node scripts (seed + minion CLI).
 *
 * This deployment uses no auth: the public (publishable/anon) key has full access
 * to the `mb_` tables via RLS policies, so the CLI just uses the key directly —
 * no sign-in step.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");

/** Minimal .env.local parser (no extra dependency). */
export function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = readFileSync(join(repoRoot, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // no .env.local — rely on process.env
  }
  return env;
}

/** Returns a Supabase client using the public key. Throws if config is missing. */
export async function getSignedInClient() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }

  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
