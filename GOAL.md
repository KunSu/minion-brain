# 🎯 Goal — Ship Minion Brain

> The single source of truth for *what done looks like* and *where we are*.
> Full design rationale lives in [PLAN.md](./PLAN.md). This file tracks execution.

**North star:** A clean, white-dominant personal "second brain" I actually use every day — capture ideas/todos/topics/features by text or voice on phone and desktop, move them through a lifecycle, and hand tasks to a local AI agent.

**Definition of done (the whole project):** I open the app on my phone, capture an idea by voice, it's still there tomorrow on my desktop, I can drag it through its lifecycle, and I can run `minion next` to have my AI agent work a task and push the result back.

---

## Progress at a glance

| Phase | Outcome | Status |
|-------|---------|--------|
| 0. Scaffold | Next.js 16 + Tailwind v4 + UI primitives + deps | ✅ Done |
| 1. UI on local data | Full clickable app, persists to localStorage | ✅ Done |
| 2. Supabase backend | Tables created, seeded, app verified e2e on Supabase | ✅ Done (no-auth, `brain_items`) |
| 3. Voice capture | Speak → item (Chrome-first, en/zh toggle) | ✅ Done |
| 4. `minion` CLI | Agent pulls tasks, pushes results back | ✅ Done |
| 5. Polish | PWA, dark mode, e2e tests, docs | ✅ Done |
| 6. Deploy to Vercel | Live at minion-brain.vercel.app | ✅ Done |

**Supabase is live:** shares the little-minion project; tables `brain_items` /
`projects` / `tags` / `ai_tasks` created via the Management API (existing tables
untouched), seeded, RLS-open, no auth. Verified e2e — created an item on desktop,
saw it sync to a separate mobile context, confirmed the row in the DB. 18/18
Playwright tests pass.
See "What I need to do" below and the README.

Legend: ⬜ not started · 🟡 in progress · ✅ done

---

## Phase 1 — UI on local data  ✅ DONE

**Done when:** I can browse List + Board, capture (incl. pressing `c`), edit, search, filter, change status, archive — and everything survives a page refresh, on both phone and desktop viewports.

- [x] Data contract `lib/types.ts` (zod): Item / Project / Tag / AiTask + status/type/priority unions
- [x] `Store` interface `lib/data/store.ts` + `localStore.ts` + `fixtures.ts`
- [x] White-dominant theme (tokens, font, accent) in `globals.css`
- [x] UI primitives (button, dialog, select, dropdown, input, badge, command)
- [x] List view grouped by status + inline status dropdown
- [x] Item detail/edit panel (title, notes, type, status, priority, project, tags, due date)
- [x] Quick-capture bar + `c`-to-capture shortcut
- [x] Kanban board (drag between stages) + List/Board toggle
- [x] Search (title+notes) + filters (status/type/tag/project/priority)
- [x] Soft-delete (archive) — no hard delete
- [x] Empty + loading states
- [x] Verified responsive with webapp-testing screenshots (desktop + mobile); persistence confirmed across reload; `pnpm build` green

**Next target → Phase 2.** Before starting, I (the human) need to fix `.env.local` (see below).

---

## What I (the human) need to do — to go live

> All code is written, built green, and e2e-tested. These are console/account
> steps only I can perform. Full walkthrough in the README ("Going live").

1. **Supabase project:** create one at supabase.com.
2. **Run the schema:** paste `supabase/migrations/0001_init.sql` into the SQL editor and run (creates tables + RLS).
3. **Create my login:** Authentication → Users → Add user (email + password).
4. **Fix `.env.local`:** rename the `eyJ…` value into `NEXT_PUBLIC_SUPABASE_ANON_KEY` (it's currently in the `SUPABASE_SERVICE_ROLE_KEY` slot — no service-role key is used). Add `MINION_EMAIL` / `MINION_PASSWORD`.
5. **Seed:** `pnpm seed`.
6. **Run:** `pnpm dev` → sign in. (Without these, the app keeps working on localStorage.)
7. **Deploy:** push to GitHub → import to Vercel → add the two `NEXT_PUBLIC_*` env vars.
8. **Backup cron:** add a nightly `pnpm minion export` (see README).

**Before first commit/push:** confirm I want changes committed (Claude is holding all code locally). Repo: `KunSu/minion-brain`, identity `kunsu.903@gmail.com`.

---

## Guardrails (carry through every phase)

- **Hold commits** until I explicitly approve. Everything stays local for now.
- **Soft-delete only** — never hard-delete my data.
- **Anon key + RLS is the whole security model** — no service-role key anywhere; the CLI logs in as my single user and RLS limits it to my rows.
- **One data contract, one Store interface** — swapping mock→Supabase must stay a one-file change.
- Match my existing conventions (TypeScript strict, Tailwind, clean/minimal).

---

## Deferred (explicitly NOT now)

Offline writes / service-worker sync · conflict resolution / CRDTs · multi-user sharing · hard delete · realtime cross-device sync (Phase 5 optional).
