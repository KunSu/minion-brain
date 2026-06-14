# Minion Brain

A clean, white-dominant personal "second brain" — capture **ideas, todos, research topics, and features**, move them through one shared lifecycle, capture by voice, and hand tasks to a local AI agent that writes results back.

Built with **Next.js 16 + TypeScript + Tailwind v4 + shadcn-style UI on Supabase + Vercel**. Single user.

> Design rationale lives in [`PLAN.md`](./PLAN.md); execution status in [`GOAL.md`](./GOAL.md).

---

## Quick start (no backend needed)

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. With no Supabase env configured, the app runs entirely on **localStorage** (data persists in your browser) — fully usable for capture, List/Board, search, voice, and queueing AI tasks. This is the zero-setup demo mode.

## How the backend is chosen

`src/lib/data/index.ts` picks the backend automatically:

| Condition | Backend |
|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set | **Supabase** (synced, multi-device) |
| otherwise (or `NEXT_PUBLIC_FORCE_LOCAL_STORE=1`) | **localStorage** (this browser) |

Both implement the same `Store` interface (`src/lib/data/store.ts`), so swapping is invisible to the UI.

---

## Going live with Supabase (Phase 2)

1. **Create or pick a project** at https://supabase.com.
2. **Run the schema:** paste [`supabase/migrations/0002_brain_items.sql`](./supabase/migrations/0002_brain_items.sql) into the Supabase SQL editor and run it. This creates `brain_items`, `projects`, `tags`, `ai_tasks` (+ enums, `updated_at` triggers, and RLS policies). It uses `if not exists` and only creates new objects, so it's safe to run on a project shared with another app.
3. **Fill `.env.local`** (see template below).
4. **Seed starter data:** `pnpm seed` (or `pnpm seed --reset` to wipe-and-reseed Minion Brain's rows).
5. **Run:** `pnpm dev` — no login; the app uses the public key directly.
6. **Deploy:** see the [Deployment](#deployment-vercel) section.

### `.env.local`

```bash
# Supabase — used by both the website and the minion CLI
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   # or the legacy eyJ... anon key
```

**Auth model:** this deployment has **no login**. The public (publishable/anon) key
is used directly, and RLS policies grant it access to the Minion Brain tables.
⚠️ Anyone with the deployed URL can read/write this data — intended for
non-sensitive personal notes. Delete is always soft (archive) — nothing is
hard-deleted. The items table is named **`brain_items`** so it can share a
project with another app without colliding on `items`.

---

## Deployment (Vercel)

- **Production:** https://minion-brain.vercel.app
- **Project:** `minion-brain` on Vercel (separate from `little-minion`). Env vars
  `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set there.
- **Deploy protection is OFF**, so preview URLs are publicly clickable.

There are **no git commits** on this project (everything is local); deploys go
through the Vercel CLI with a token:

```bash
export VERCEL_TOKEN=<vercel token>
vercel deploy --yes --token "$VERCEL_TOKEN"        # preview URL
vercel deploy --prod --yes --token "$VERCEL_TOKEN" # promote to production
```

**Convention:** after every change, deploy a **preview** and share the URL for
review before promoting to production.

## Database changes

The Supabase **publishable/anon key cannot run DDL**. To create/alter tables, use
the Management API with a personal access token (`sbp_…`):

```bash
curl -X POST "https://api.supabase.com/v1/projects/<project-ref>/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"<SQL here>"}'
```

The project shares the **little-minion** Supabase project (`<project-ref>` in
`NEXT_PUBLIC_SUPABASE_URL`). Migrations must be additive (`if not exists`) and
**never touch** little-minion's tables (`items`, `lists`, `foods`, …). Minion
Brain owns only `brain_items` / `projects` / `tags` / `ai_tasks`.

## Voice capture (Phase 3)

The mic button in the capture bar uses the browser's Web Speech API as a progressive enhancement. Toggle **EN / 中** for dictation language. Supported in Chrome/Edge/Safari; the button is hidden where unsupported (e.g. Firefox), and typing always works.

---

## The `minion` CLI (Phase 4)

Your AI agent drives this on your machine to work tasks queued from the app's **Send to AI** panel.

```bash
pnpm minion next                         # claim & print the next queued task (FIFO), mark running
pnpm minion list                         # list pending tasks
pnpm minion done <id> --result out.md    # attach a result file, mark done (idempotent)
pnpm minion done <id> --result-text "…"  # attach inline result
pnpm minion fail <id> --error "reason"   # mark failed
pnpm minion export --out backup.json     # dump your whole brain to JSON (backup)
```

**Agentic flow:** tell Claude Code *"work on my next minion task"* → it runs `minion next`, does the work with its real tools, then `minion done <id> --result <file>`. Works with any agent — it's just shell commands.

**Nightly backup (recommended):** add a cron entry, e.g.
```bash
0 2 * * *  cd /path/to/minion-brain && pnpm minion export --out "backups/$(date +\%F).json"
```

---

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Run the app (localhost:3000) |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm seed [--reset]` | Seed Supabase from fixtures |
| `pnpm minion <cmd>` | The AI task CLI |
| `pnpm test:e2e` | Playwright e2e (boots app on :3101 against local store) |

---

## Project structure

```
src/
  app/                  Next.js App Router (layout, page, globals.css theme)
  components/
    ui/                 shadcn-style primitives (button, dialog, select, …)
    capture/            QuickCapture (text + voice)
    items/              ListView, BoardView, ItemDetail, SendToAI, chips, filters
    AppShell.tsx        the app layout + state wiring
    AccountMenu.tsx     backend indicator + JSON export
  hooks/                useStore, useSpeechRecognition, useTheme
  lib/
    types.ts            zod data contract (single source of truth)
    display.ts          labels/colors for statuses/types/priorities
    data/               store.ts (interface) + localStore + supabaseStore + index (switch)
    supabase/           browser client
scripts/                seed + shared Node Supabase client
cli/                    minion.mjs
e2e/                    Playwright specs
supabase/migrations/    SQL schema + RLS
```

---

## Lifecycle

`Inbox → Active → In Progress → (Blocked) → Pending Approval → Done → Archived` — one shared lifecycle for all four item types; types are convertible. Board columns map to the active stages; Archived is the soft-delete sink.

**`Pending Approval` is the human-gate:** agentic work (e.g. an AI completing a task)
must move an item to **Pending Approval**, never directly to **Done**. Only a human
moves it to Done after reviewing.

> Changing the lifecycle = edit **three** places in lockstep: `ITEM_STATUSES`
> (`src/lib/types.ts`), `STATUS_META` (`src/lib/display.ts`), and the
> `mb_item_status` Postgres enum (migration + apply to the live DB).
