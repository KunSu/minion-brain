-- Minion Brain — schema for sharing the little-minion Supabase project.
-- Only the items table is renamed (to `brain_items`) to avoid colliding with
-- little-minion's existing `items` table; projects/tags/ai_tasks are free names.
-- Run this once in the Supabase SQL editor.
--
-- AUTH MODEL: no login. The website and CLI use the public (publishable/anon)
-- key directly, and RLS policies below allow that key full access. NOTE: anyone
-- with the deployed URL can read/write this data. Chosen intentionally for
-- non-sensitive personal notes.
--
-- Safe to run on the shared project: it only creates new objects (prefixed enums
-- + brain_items/projects/tags/ai_tasks) and never touches existing tables.

-- ---- Enums (prefixed to avoid clashes with any existing types) ----
do $$ begin
  create type mb_item_type as enum ('idea', 'todo', 'topic', 'feature');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mb_item_status as enum ('inbox', 'active', 'in_progress', 'blocked', 'pending_approval', 'done', 'archived');
exception when duplicate_object then null; end $$;

-- For projects created before pending_approval existed, add it in place (idempotent).
alter type mb_item_status add value if not exists 'pending_approval' before 'done';

do $$ begin
  create type mb_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mb_ai_task_status as enum ('queued', 'running', 'done', 'failed');
exception when duplicate_object then null; end $$;

-- ---- Tables (no `owner` column — single shared dataset, no auth) ----
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unique (name)
);

create table if not exists brain_items (
  id uuid primary key default gen_random_uuid(),
  type mb_item_type not null default 'idea',
  status mb_item_status not null default 'inbox',
  priority mb_priority not null default 'medium',
  title text not null,
  notes text not null default '',
  project_id uuid references projects (id) on delete set null,
  tag_ids uuid[] not null default '{}',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists brain_items_status_idx on brain_items (status);

create table if not exists ai_tasks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references brain_items (id) on delete cascade,
  agent text not null default 'claude',
  status mb_ai_task_status not null default 'queued',
  prompt text not null,
  result text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_tasks_status_idx on ai_tasks (status, created_at);

-- ---- updated_at trigger ----
create or replace function mb_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_brain_items_updated on brain_items;
create trigger trg_brain_items_updated
  before update on brain_items
  for each row execute function mb_set_updated_at();

drop trigger if exists trg_ai_tasks_updated on ai_tasks;
create trigger trg_ai_tasks_updated
  before update on ai_tasks
  for each row execute function mb_set_updated_at();

-- ---- RLS: enabled, with policies granting the public key full access ----
alter table projects enable row level security;
alter table tags enable row level security;
alter table brain_items enable row level security;
alter table ai_tasks enable row level security;

drop policy if exists "mb open projects" on projects;
create policy "mb open projects" on projects for all
  to anon, authenticated using (true) with check (true);

drop policy if exists "mb open tags" on tags;
create policy "mb open tags" on tags for all
  to anon, authenticated using (true) with check (true);

drop policy if exists "mb open brain_items" on brain_items;
create policy "mb open brain_items" on brain_items for all
  to anon, authenticated using (true) with check (true);

drop policy if exists "mb open ai_tasks" on ai_tasks;
create policy "mb open ai_tasks" on ai_tasks for all
  to anon, authenticated using (true) with check (true);

-- ---- Atomic tag deletion: strip the tag from all items + delete it in one txn ----
create or replace function mb_delete_tag(p_tag_id uuid)
returns void
language sql
as $$
  update brain_items set tag_ids = array_remove(tag_ids, p_tag_id) where tag_ids @> array[p_tag_id];
  delete from tags where id = p_tag_id;
$$;
