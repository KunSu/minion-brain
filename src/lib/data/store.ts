/**
 * The data-access seam. Every read/write in the app goes through this `Store`
 * interface — components NEVER touch a data source directly.
 *
 * Phase 1 ships `localStore` (browser-persisted). Phase 2 adds `supabaseStore`
 * implementing this same interface, so swapping backends is a one-line change in
 * `index.ts`. Keep this interface backend-agnostic: no localStorage- or
 * Supabase-specific concepts leak in.
 */
import type {
  AiTask,
  AiTaskStatus,
  CreateItemInput,
  Item,
  Project,
  Tag,
  UpdateItemInput,
} from "../types";

/** Filters applied when listing items. All fields optional / AND-combined. */
export interface ItemFilter {
  /** Restrict to these statuses. Omitted = all non-archived. */
  statuses?: Item["status"][];
  types?: Item["type"][];
  priorities?: Item["priority"][];
  projectId?: string | null;
  tagId?: string;
  /** Free-text search over title + notes (case-insensitive). */
  query?: string;
  /** Include archived items (default false). */
  includeArchived?: boolean;
}

export interface Store {
  // Items
  listItems(filter?: ItemFilter): Promise<Item[]>;
  getItem(id: string): Promise<Item | null>;
  createItem(input: CreateItemInput): Promise<Item>;
  updateItem(id: string, patch: UpdateItemInput): Promise<Item>;
  /** Soft-delete: moves the item to `archived`. We never hard-delete. */
  archiveItem(id: string): Promise<Item>;

  // Projects
  listProjects(): Promise<Project[]>;
  createProject(input: { name: string; color?: string }): Promise<Project>;
  updateProject(id: string, patch: { name?: string; color?: string }): Promise<Project>;
  /** Delete a project; items referencing it are unlinked (project_id → null). */
  deleteProject(id: string): Promise<void>;

  // Tags
  listTags(): Promise<Tag[]>;
  /** Create a tag if one with this name doesn't already exist; returns it either way. */
  ensureTag(name: string): Promise<Tag>;
  updateTag(id: string, patch: { name: string }): Promise<Tag>;
  /** Delete a tag; it is removed from every item's tag list. */
  deleteTag(id: string): Promise<void>;

  // AI tasks (Phase 4)
  listAiTasks(itemId?: string): Promise<AiTask[]>;
  /** Queue a task for the local agent against an item. */
  createAiTask(input: { item_id: string; prompt: string; agent?: string }): Promise<AiTask>;
  /** Update a task's lifecycle / result (used by the minion CLI). */
  updateAiTask(
    id: string,
    patch: { status?: AiTaskStatus; result?: string | null; error?: string | null },
  ): Promise<AiTask>;

  /** Full snapshot for the export/backup path. */
  exportAll(): Promise<{
    items: Item[];
    projects: Project[];
    tags: Tag[];
    aiTasks: AiTask[];
  }>;
}
