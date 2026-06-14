# Minion Brain — Personal "Second Brain" Web App

## Context

A single place to capture everything in your head — **ideas, todos, research topics, and features** — usable on both **mobile and desktop**. Each item moves through a **status life cycle**. You can **capture by voice**, and **hand a task to an AI agent (Claude Code / Codex) that you run locally**, with results flowing back into the app.

The UI must be **clean, premium, modern, white-dominant**. This plan is written CTO-style: optimize for something **usable fast** and **maintainable for years**, using a small, well-known stack.

### Key decisions (confirmed)
- **Stack:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, deployed on **Vercel**; **Supabase** (Postgres) as the backend.
- **Supabase project:** shares the existing **little-minion** project. To avoid colliding with that app's `items`/`lists` tables, Minion Brain's items table is named **`brain_items`**; `projects`, `tags`, `ai_tasks` use plain names (they were free). Enum *types* are `mb_`-prefixed to avoid type-name clashes. The migration uses `if not exists` and only creates new objects — **it never touches little-minion's tables**.
- **Auth: none.** No login. The website and `minion` CLI use the public (publishable/anon) key directly; RLS policies grant that key full access to the Minion Brain tables. ⚠️ Anyone with the deployed URL can read/write this data — accepted intentionally for non-sensitive personal notes.
- **Voice:** Browser's built-in speech recognition (progressive enhancement — see Voice section for browser reality).
- **AI integration:** A **local CLI client** (`minion`) — a small command-line tool you run on your own machine. Your agent (Claude Code / Codex) calls it with plain shell commands to pull tasks and push results back. No always-on server, no MCP. The CLI uses the public key directly (no login step).
- **Lifecycle:** One shared lifecycle across all 4 types, with conversion between types allowed.
- **Views:** Both a fast **List** view and a **Kanban board** (toggle) — both in V1.
- **Organization:** Free-form **tags**, **projects**, **priority**, **due dates**.
- **Build order:** **UI/UX first, with persisted local data**, then wire Supabase, then voice, then the CLI.
- **Safety:** **Soft-delete only** (archive, never hard-delete) + an **export/backup** path from day one, so your data is never lost.

---

## Build Philosophy: Design First, Wire Later — but on a Real Contract

We build the entire interface first, but on two foundations that make the later backend swap a *drop-in* instead of a rewrite — the single biggest risk this plan guards against:

1. **One shared data contract** (`lib/types.ts`). Item, Project, Tag, and AI Task are defined **once** (zod-derived, so we also get runtime validation at the Supabase boundary later). Mock data and real data conform to the exact same shapes — UUID ids, ISO-string dates, exact nullables — so component props never drift between phases.

2. **One data-access layer** (`lib/data/store.ts`). All reading/writing goes through a `Store` interface (`listItems`, `getItem`, `createItem`, `updateItem`, `archiveItem`, `listProjects`, `listTags`, `searchItems`, …). Components **never** touch the data source directly. We ship a `localStore` first (persisted to the browser), then add a `supabaseStore` later — **swapping is one file / one env flag**.

This means Phase 1 is genuinely usable (your items survive refresh) and Phase 2 is a swap, not a redesign.

---

## The Experience (what you'll see and do)

**Main screen** — white, calm, spacious. Header with search + a view toggle (List / Board). A prominent **quick-capture** bar (and a mic button) always within reach. Press **`c`** anywhere to capture.

**Capturing**
- Type a quick line (Enter to save), or tap the **mic** and speak — it becomes a new item (defaults to *idea* in the *Inbox*), which you can refine.
- A **⌘K command palette** to jump, search, or create from anywhere.

**Working with items**
- **List view:** dense, scannable, grouped and filterable by status, type, tag, project, priority. Inline status dropdown to advance the lifecycle. Best on mobile.
- **Board view:** columns are the lifecycle stages; drag a card from one stage to the next. Best on desktop.
- Open any item to edit its title, notes (markdown), type, status, priority, project, tags, and due date.

**The lifecycle** (same for all four types):
`Inbox → Active → In Progress → (Blocked) → Done → Archived`
An item can be **converted** between types (e.g. an *idea* becomes a *feature*) without losing its history. **Delete = move to Archived** (soft-delete); nothing is ever hard-deleted from the UI.

**Handing work to your AI**
- On any item, **"Send to AI"** queues a task with a prompt.
- On your machine you run the **`minion` CLI**, which hands the task to your agent and pushes the result back into the item.

---

## Data Contract (single source of truth)

Defined once in `lib/types.ts` (zod schemas → inferred TypeScript types), shared by mock, local, and Supabase data. Invariants enforced everywhere:
- **ids** are UUIDs (generated in the local store too, so they match the DB).
- **dates/timestamps** are ISO strings.
- **nullables** modeled exactly as the database will store them.

The four entities (plain language):
- **Item** — the core unit: *type* (idea / todo / topic / feature), *status* (lifecycle stage), *priority* (low / medium / high), *title*, optional *notes* (markdown), optional *project*, any number of *tags*, optional *due date*, `created_at` / `updated_at`, `archived` flag.
- **Project** — a named, colored grouping items can belong to.
- **Tag** — a free-form label; items can have many.
- **AI Task** — a request attached to an item: the *prompt* sent, its *status* (queued / running / done / failed), and the *result* returned.

Mock fixtures live in `lib/data/fixtures.ts` and are **reused as the Supabase seed** in Phase 2 — free seed data that proves the contract end-to-end.

---

## UI / UX Direction

White-dominant, premium, modern — in the spirit of your `little-minion` project.

- **Color:** white / near-white surfaces, soft neutral borders, generous whitespace, a single restrained accent. Subtle shadows, rounded corners.
- **Type:** one clean, characterful sans with strong hierarchy and calm spacing.
- **Components:** shadcn/ui (accessible dialogs, selects, command palette).
- **Mobile-first:** bottom action bar with a prominent **mic / quick-capture** button; List is the mobile default. Desktop adds the Board and a wider layout.
- **Signature touches:** instant quick-capture, ⌘K palette, `c`-to-capture, smooth status transitions, tasteful empty states.

---

## The `minion` CLI (AI integration)

A small command-line tool you install on your machine. It talks to Supabase using the **public (publishable/anon) key** directly — no login step, matching the website. It reads/writes the `brain_items` / `projects` / `tags` / `ai_tasks` tables.

Commands:
- `minion next` — fetch the next queued AI task, FIFO by `created_at` (prints the prompt + item context).
- `minion list` — show pending tasks.
- `minion done <id> --result <file>` — push a finished result back into the item. **Idempotent** (no-op if already done) so a re-run never corrupts state.
- `minion fail <id> --error <msg>` — mark a task failed with a reason.
- `minion export [--out backup.json]` — dump your entire brain to JSON (backup).

**Agentic flow:** in Claude Code you say *"work on my next minion task"* — the agent runs `minion next`, does the work with its real tools, then runs `minion done`. Because it's just shell commands, it works with **any** agent with no app changes.

> ⚠️ **No-auth model.** The public key is in the deployed site and the CLI; RLS policies allow it full access to the Minion Brain tables. Anyone with the URL can read/write this data — accepted for non-sensitive notes. Mitigations: the UI/CLI only ever **soft-delete** (archive), and `minion export` gives you a restorable backup. Run a nightly `minion export` via cron so you always have a recent snapshot.

---

## Phases

### Phase 1 — UI/UX with persisted local data  ← we start here
Scaffold the Next.js app, establish the **data contract + Store interface**, and build the **complete interface** against a **`localStore`** (persisted to the browser, survives refresh):
- `lib/types.ts` (zod contract) + `lib/data/store.ts` (interface) + `lib/data/localStore.ts` + `lib/data/fixtures.ts`.
- Full visual theme (white-dominant styling above).
- List view (inline status dropdown) **and** Kanban board (drag between stages) with the view toggle.
- Item detail/edit panel; quick-capture bar; `c`-to-capture; ⌘K command palette.
- Working **search** (over title + notes) and filters (status / type / tag / project / priority); empty/loading states.
- Soft-delete (archive) — no hard delete.
- Responsive: verify on phone and desktop (webapp-testing screenshots).
**Outcome:** a clickable, real-feeling, *actually usable* app you can dogfood before any backend exists.

### Phase 2 — Wire up Supabase
- Create the tables (`brain_items` / `projects` / `tags` / `ai_tasks`) via `supabase/migrations/0002_brain_items.sql` (no-auth, RLS-open). Shares the little-minion project; touches no existing tables.
- Add `lib/data/supabaseStore.ts` implementing the same `Store` interface — **swap is automatic via env** (`index.ts` picks Supabase when the keys are present).
- **Seed** the database from `fixtures.ts` (`pnpm seed`).
- Deploy to Vercel.

### Phase 3 — Voice capture
- Mic button as a **progressive enhancement** on the text capture bar (only renders if the browser supports speech recognition).
- Explicit **language toggle** (`en-US` / `zh-CN`) — no auto-detect.
- Guaranteed typed fallback. **Chrome/Edge/Safari supported; Firefox unsupported; iOS Safari caveated.**

### Phase 4 — AI integration (the `minion` CLI)
- "Send to AI" on an item queues a task.
- Build and document the `minion` CLI (commands above), including `minion export` and nightly-cron guidance.

### Phase 5 — Polish (ongoing)
- Optional **Realtime** (live updates across devices), dark mode, optimistic updates, full-text search (`tsvector`), Playwright end-to-end tests, **PWA manifest** for one-tap mobile capture ("Add to Home Screen").

**Explicitly out of scope (last-write-wins is correct for one user):** offline writes / service-worker sync, conflict resolution / CRDTs, multi-user sharing, hard delete.

---

## Setup You Provide (one-time, no further questions needed)

Everything in **Phase 1 runs with no setup at all**. The values below are only needed starting at Phase 2.

### 1. Supabase (database) — free tier
1. Use an existing project (we share **little-minion**) or create one.
2. **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **publishable / anon** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` *(used by both the website and the `minion` CLI)*
3. **SQL Editor → New query**: paste `supabase/migrations/0002_brain_items.sql` and run. Creates `brain_items` / `projects` / `tags` / `ai_tasks` (+ enums, triggers, RLS). No login needed; RLS policies grant the public key access.

### 2. Vercel (hosting) — free tier
1. Go to **https://vercel.com** → sign in with GitHub.
2. Connect/import this repo when Phase 2 is ready.
3. In Vercel **Project Settings → Environment Variables**, add the two `NEXT_PUBLIC_*` values.

### 3. `.env.local` template
```
# ---- Supabase (used by both the website and the minion CLI) ----
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key-here
```
`.env.local` is git-ignored. **No service-role key, no login** — the public key + RLS-open policies are the whole model. ⚠️ Data is readable/writable by anyone with the URL; intended for non-sensitive notes.

---

## Verification

- **Phase 1:** App runs locally; browse List and Board, capture items (incl. `c` shortcut), drag between stages, open/edit, search, filter, archive — all persisted across reloads, on both phone and desktop.
- **Phase 2:** Items persist in Supabase (`brain_items`) across devices; seed data loads; deploys green on Vercel; the `localStore`→`supabaseStore` swap is automatic from env.
- **Phase 3:** Speaking in Chinese and English (with the language toggle) creates correct items in supported browsers; unsupported browsers fall back to typing.
- **Phase 4:** "Send to AI" queues a task; `minion next` fetches it (FIFO); `minion done` returns a result that appears on the item; re-running `minion done` is a no-op; `minion export` produces a valid backup.
- **Cross-device:** core flows verified on a phone and a desktop browser.
