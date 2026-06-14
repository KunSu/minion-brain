/**
 * Browser-persisted implementation of `Store`, backed by localStorage.
 *
 * This is the Phase 1 backend: it makes the app genuinely usable (data survives
 * refresh) before Supabase exists. It is intentionally simple and synchronous
 * under the hood, but exposes the async `Store` interface so the Supabase swap
 * later is a no-op for callers.
 */
import { nowIso, uuid } from "../utils";
import { PRIORITY_META } from "../display";
import type {
  AiTask,
  CreateItemInput,
  Item,
  Project,
  Tag,
  UpdateItemInput,
} from "../types";
import { seedAiTasks, seedItems, seedProjects, seedTags } from "./fixtures";
import type { ItemFilter, Store } from "./store";

const STORAGE_KEY = "minion-brain:v1";

interface DbShape {
  items: Item[];
  projects: Project[];
  tags: Tag[];
  aiTasks: AiTask[];
}

function seedDb(): DbShape {
  return {
    items: structuredClone(seedItems),
    projects: structuredClone(seedProjects),
    tags: structuredClone(seedTags),
    aiTasks: structuredClone(seedAiTasks),
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function load(): DbShape {
  if (!isBrowser()) return seedDb();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const fresh = seedDb();
    save(fresh);
    return fresh;
  }
  try {
    return JSON.parse(raw) as DbShape;
  } catch {
    // Corrupt payload — reset rather than crash the whole app.
    const fresh = seedDb();
    save(fresh);
    return fresh;
  }
}

function save(db: DbShape): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
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

/** Newest-updated first, then by priority rank. */
function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const byPriority = PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank;
    if (byPriority !== 0) return byPriority;
    return b.updated_at.localeCompare(a.updated_at);
  });
}

export const localStore: Store = {
  async listItems(filter = {}) {
    const db = load();
    return sortItems(db.items.filter((i) => matchesFilter(i, filter)));
  },

  async getItem(id) {
    const db = load();
    return db.items.find((i) => i.id === id) ?? null;
  },

  async createItem(input: CreateItemInput) {
    const db = load();
    const ts = nowIso();
    const item: Item = {
      id: uuid(),
      type: input.type ?? "idea",
      status: input.status ?? "inbox",
      priority: input.priority ?? "medium",
      title: input.title,
      notes: input.notes ?? "",
      project_id: input.project_id ?? null,
      tag_ids: input.tag_ids ?? [],
      due_date: input.due_date ?? null,
      created_at: ts,
      updated_at: ts,
    };
    db.items.push(item);
    save(db);
    return item;
  },

  async updateItem(id, patch: UpdateItemInput) {
    const db = load();
    const idx = db.items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error(`Item not found: ${id}`);
    const updated: Item = { ...db.items[idx], ...patch, updated_at: nowIso() };
    db.items[idx] = updated;
    save(db);
    return updated;
  },

  async archiveItem(id) {
    return this.updateItem(id, { status: "archived" });
  },

  async listProjects() {
    return load().projects;
  },

  async createProject(input) {
    const db = load();
    const project: Project = {
      id: uuid(),
      name: input.name.trim(),
      color: input.color ?? "#6366f1",
      created_at: nowIso(),
    };
    db.projects.push(project);
    save(db);
    return project;
  },

  async updateProject(id, patch) {
    const db = load();
    const idx = db.projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Project not found: ${id}`);
    const updated: Project = {
      ...db.projects[idx],
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
    };
    db.projects[idx] = updated;
    save(db);
    return updated;
  },

  async deleteProject(id) {
    const db = load();
    db.projects = db.projects.filter((p) => p.id !== id);
    // Unlink items that referenced it (bump updated_at to match the DB trigger).
    const ts = nowIso();
    db.items = db.items.map((i) =>
      i.project_id === id ? { ...i, project_id: null, updated_at: ts } : i,
    );
    save(db);
  },

  async listTags() {
    return load().tags;
  },

  async ensureTag(name) {
    const db = load();
    const existing = db.tags.find(
      (t) => t.name.toLowerCase() === name.toLowerCase().trim(),
    );
    if (existing) return existing;
    const tag: Tag = { id: uuid(), name: name.trim() };
    db.tags.push(tag);
    save(db);
    return tag;
  },

  async updateTag(id, patch) {
    const db = load();
    const idx = db.tags.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Tag not found: ${id}`);
    const updated: Tag = { ...db.tags[idx], name: patch.name.trim() };
    db.tags[idx] = updated;
    save(db);
    return updated;
  },

  async deleteTag(id) {
    const db = load();
    db.tags = db.tags.filter((t) => t.id !== id);
    // Remove from every item's tag list (bump updated_at to match the DB).
    const ts = nowIso();
    db.items = db.items.map((i) =>
      i.tag_ids.includes(id)
        ? { ...i, tag_ids: i.tag_ids.filter((t) => t !== id), updated_at: ts }
        : i,
    );
    save(db);
  },

  async listAiTasks(itemId) {
    const db = load();
    const tasks = itemId
      ? db.aiTasks.filter((t) => t.item_id === itemId)
      : db.aiTasks;
    return [...tasks].sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  async createAiTask(input) {
    const db = load();
    const ts = nowIso();
    const task: AiTask = {
      id: uuid(),
      item_id: input.item_id,
      agent: input.agent ?? "claude",
      status: "queued",
      prompt: input.prompt,
      result: null,
      error: null,
      created_at: ts,
      updated_at: ts,
    };
    db.aiTasks.push(task);
    save(db);
    return task;
  },

  async updateAiTask(id, patch) {
    const db = load();
    const idx = db.aiTasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`AI task not found: ${id}`);
    const updated: AiTask = { ...db.aiTasks[idx], ...patch, updated_at: nowIso() };
    db.aiTasks[idx] = updated;
    save(db);
    return updated;
  },

  async exportAll() {
    const db = load();
    return {
      items: db.items,
      projects: db.projects,
      tags: db.tags,
      aiTasks: db.aiTasks,
    };
  },
};
