"use client";

/**
 * Supabase-backed implementation of `Store`. Same interface as localStore, so the
 * rest of the app is unaffected by the swap — only `index.ts` changes which one
 * is exported.
 *
 * No auth: RLS policies grant the public key full access (single shared dataset),
 * so we never filter by user. Sorting/filtering mirrors localStore for consistent UX.
 */
import { getSupabaseClient } from "../supabase/client";
import { PRIORITY_META } from "../display";
import {
  UpdateItemInputSchema,
  type AiTask,
  type CreateItemInput,
  type Item,
  type Project,
  type Tag,
  type UpdateItemInput,
} from "../types";
import type { ItemFilter, Store } from "./store";

function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const byPriority = PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank;
    if (byPriority !== 0) return byPriority;
    return b.updated_at.localeCompare(a.updated_at);
  });
}

function matchesFilter(item: Item, filter: ItemFilter): boolean {
  if (!filter.includeArchived && !filter.statuses && item.status === "archived") {
    return false;
  }
  if (filter.statuses && !filter.statuses.includes(item.status)) return false;
  if (filter.types && !filter.types.includes(item.type)) return false;
  if (filter.priorities && !filter.priorities.includes(item.priority)) return false;
  if (filter.projectId !== undefined && item.project_id !== filter.projectId) return false;
  if (filter.tagId && !item.tag_ids.includes(filter.tagId)) return false;
  if (filter.query) {
    const q = filter.query.toLowerCase().trim();
    const haystack = `${item.title}\n${item.notes}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
  }
  return true;
}

export const supabaseStore: Store = {
  async listItems(filter = {}) {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from("brain_items").select("*");
    if (error) throw error;
    const items = (data ?? []).map((r) => r as Item);
    return sortItems(items.filter((i) => matchesFilter(i, filter)));
  },

  async getItem(id) {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from("brain_items").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? (data as Item) : null;
  },

  async createItem(input: CreateItemInput) {
    const sb = getSupabaseClient();
    const row = {
      type: input.type ?? "idea",
      status: input.status ?? "inbox",
      priority: input.priority ?? "medium",
      title: input.title,
      notes: input.notes ?? "",
      project_id: input.project_id ?? null,
      tag_ids: input.tag_ids ?? [],
      due_date: input.due_date ?? null,
    };
    const { data, error } = await sb.from("brain_items").insert(row).select("*").single();
    if (error) throw error;
    return data as Item;
  },

  async updateItem(id, patch: UpdateItemInput) {
    const sb = getSupabaseClient();
    // Validate + strip unknown keys at the DB boundary; updated_at stays DB-owned.
    const clean = UpdateItemInputSchema.parse(patch);
    const { data, error } = await sb
      .from("brain_items")
      .update(clean)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Item;
  },

  async archiveItem(id) {
    return this.updateItem(id, { status: "archived" });
  },

  async listProjects() {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => r as Project);
  },

  async createProject(input) {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("projects")
      .insert({ name: input.name.trim(), color: input.color ?? "#6366f1" })
      .select("*")
      .single();
    if (error) throw error;
    return data as Project;
  },

  async updateProject(id, patch) {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("projects")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Project;
  },

  async deleteProject(id) {
    const sb = getSupabaseClient();
    // The schema sets items.project_id to null on delete (ON DELETE SET NULL).
    const { error } = await sb.from("projects").delete().eq("id", id);
    if (error) throw error;
  },

  async listTags() {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from("tags").select("*").order("name");
    if (error) throw error;
    return (data ?? []).map((r) => r as Tag);
  },

  async ensureTag(name) {
    const sb = getSupabaseClient();
    const trimmed = name.trim();
    // Exact, case-insensitive match. Escape % and _ so tag names containing them
    // aren't treated as ilike wildcards. (ilike with no wildcards = exact match.)
    const pattern = trimmed.replace(/[\\%_]/g, "\\$&");
    const existing = await sb.from("tags").select("*").ilike("name", pattern).maybeSingle();
    if (existing.data) return existing.data as Tag;

    const { data, error } = await sb
      .from("tags")
      .insert({ name: trimmed })
      .select("*")
      .single();
    if (error) {
      // Lost a race against a concurrent insert (unique(name) violation) — re-select.
      if (error.code === "23505") {
        const retry = await sb.from("tags").select("*").ilike("name", pattern).maybeSingle();
        if (retry.data) return retry.data as Tag;
      }
      throw error;
    }
    return data as Tag;
  },

  async updateTag(id, patch) {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("tags")
      .update({ name: patch.name.trim() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Tag;
  },

  async deleteTag(id) {
    const sb = getSupabaseClient();
    // Atomic: a single SQL function strips the tag from every item's tag_ids and
    // deletes the tag in one implicit transaction (no half-removed state).
    const { error } = await sb.rpc("mb_delete_tag", { p_tag_id: id });
    if (error) throw error;
  },

  async listAiTasks(itemId) {
    const sb = getSupabaseClient();
    let q = sb.from("ai_tasks").select("*").order("created_at", { ascending: true });
    if (itemId) q = q.eq("item_id", itemId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => r as AiTask);
  },

  async createAiTask(input) {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("ai_tasks")
      .insert({
        item_id: input.item_id,
        prompt: input.prompt,
        agent: input.agent ?? "claude",
        status: "queued",
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as AiTask;
  },

  async updateAiTask(id, patch) {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("ai_tasks")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as AiTask;
  },

  async exportAll() {
    const sb = getSupabaseClient();
    const [items, projects, tags, aiTasks] = await Promise.all([
      sb.from("brain_items").select("*"),
      sb.from("projects").select("*"),
      sb.from("tags").select("*"),
      sb.from("ai_tasks").select("*"),
    ]);
    for (const r of [items, projects, tags, aiTasks]) {
      if (r.error) throw r.error;
    }
    return {
      items: (items.data ?? []).map((r) => r as Item),
      projects: (projects.data ?? []).map((r) => r as Project),
      tags: (tags.data ?? []).map((r) => r as Tag),
      aiTasks: (aiTasks.data ?? []).map((r) => r as AiTask),
    };
  },
};
