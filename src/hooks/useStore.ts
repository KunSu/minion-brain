"use client";

/**
 * React binding for the data `Store`. Loads items/projects/tags once on mount and
 * exposes mutation helpers that re-read after each write. Because the localStore
 * is fast and local, a simple reload-after-write keeps the UI correct without a
 * client cache. When we swap to Supabase, this hook is the only place that might
 * grow optimistic updates / realtime — components stay untouched.
 */
import * as React from "react";
import { store } from "@/lib/data";
import type { ItemFilter } from "@/lib/data";
import type {
  AiTask,
  CreateItemInput,
  Item,
  Project,
  Tag,
  UpdateItemInput,
} from "@/lib/types";

export function useStore() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    const [i, p, t] = await Promise.all([
      // include archived; filtering happens in the UI so counts stay live
      store.listItems({ includeArchived: true }),
      store.listProjects(),
      store.listTags(),
    ]);
    setItems(i);
    setProjects(p);
    setTags(t);
  }, []);

  React.useEffect(() => {
    let active = true;
    (async () => {
      await reload();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  const createItem = React.useCallback(
    async (input: CreateItemInput) => {
      const created = await store.createItem(input);
      await reload();
      return created;
    },
    [reload],
  );

  const updateItem = React.useCallback(
    async (id: string, patch: UpdateItemInput) => {
      const updated = await store.updateItem(id, patch);
      await reload();
      return updated;
    },
    [reload],
  );

  const archiveItem = React.useCallback(
    async (id: string) => {
      const archived = await store.archiveItem(id);
      await reload();
      return archived;
    },
    [reload],
  );

  const ensureTag = React.useCallback(
    async (name: string) => {
      const tag = await store.ensureTag(name);
      await reload();
      return tag;
    },
    [reload],
  );

  const createProject = React.useCallback(
    async (input: { name: string; color?: string }) => {
      const project = await store.createProject(input);
      await reload();
      return project;
    },
    [reload],
  );

  const updateProject = React.useCallback(
    async (id: string, patch: { name?: string; color?: string }) => {
      const project = await store.updateProject(id, patch);
      await reload();
      return project;
    },
    [reload],
  );

  const deleteProject = React.useCallback(
    async (id: string) => {
      await store.deleteProject(id);
      await reload();
    },
    [reload],
  );

  const updateTag = React.useCallback(
    async (id: string, patch: { name: string }) => {
      const tag = await store.updateTag(id, patch);
      await reload();
      return tag;
    },
    [reload],
  );

  const deleteTag = React.useCallback(
    async (id: string) => {
      await store.deleteTag(id);
      await reload();
    },
    [reload],
  );

  const createAiTask = React.useCallback(
    async (input: { item_id: string; prompt: string; agent?: string }) => {
      const task = await store.createAiTask(input);
      return task;
    },
    [],
  );

  const listAiTasks = React.useCallback(
    (itemId: string): Promise<AiTask[]> => store.listAiTasks(itemId),
    [],
  );

  return {
    items,
    projects,
    tags,
    loading,
    reload,
    createItem,
    updateItem,
    archiveItem,
    ensureTag,
    createProject,
    updateProject,
    deleteProject,
    updateTag,
    deleteTag,
    createAiTask,
    listAiTasks,
  };
}

/** Pure client-side filtering helper mirroring the Store's ItemFilter semantics. */
export function applyFilter(items: Item[], filter: ItemFilter): Item[] {
  return items.filter((item) => {
    // Auto-hide archived ONLY when no explicit status filter is set — so selecting
    // "Archived" in the Status filter still surfaces archived items.
    if (!filter.includeArchived && !filter.statuses && item.status === "archived") {
      return false;
    }
    if (filter.statuses && !filter.statuses.includes(item.status)) return false;
    if (filter.types && !filter.types.includes(item.type)) return false;
    if (filter.priorities && !filter.priorities.includes(item.priority)) return false;
    if (filter.projectId !== undefined && item.project_id !== filter.projectId) {
      return false;
    }
    if (filter.tagId && !item.tag_ids.includes(filter.tagId)) return false;
    if (filter.query) {
      const q = filter.query.toLowerCase().trim();
      const haystack = `${item.title}\n${item.notes}`.toLowerCase();
      if (q && !haystack.includes(q)) return false;
    }
    return true;
  });
}
