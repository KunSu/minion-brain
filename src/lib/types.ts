/**
 * The data contract — the single source of truth for every entity in Minion Brain.
 *
 * Defined once with zod so we get both a static TypeScript type AND runtime
 * validation (used at the Supabase boundary in Phase 2). Mock, local, and real
 * data ALL conform to these shapes, which is what makes the mock→Supabase swap a
 * drop-in instead of a rewrite.
 *
 * Invariants enforced here and everywhere:
 *  - ids are UUID strings (generated locally too, so they match the DB)
 *  - timestamps/dates are ISO strings
 *  - nullables are modeled exactly as the database will store them
 */
import { z } from "zod";

// ---- Enumerations (the shared lifecycle + classifications) ----

/** The four kinds of thing you capture. */
export const ITEM_TYPES = ["idea", "todo", "topic", "feature"] as const;
export const ItemTypeSchema = z.enum(ITEM_TYPES);
export type ItemType = z.infer<typeof ItemTypeSchema>;

/** One shared lifecycle for every type. Order here is the canonical flow order. */
export const ITEM_STATUSES = [
  "inbox",
  "active",
  "in_progress",
  "blocked",
  "pending_approval",
  "done",
  "archived",
] as const;
export const ItemStatusSchema = z.enum(ITEM_STATUSES);
export type ItemStatus = z.infer<typeof ItemStatusSchema>;

export const PRIORITIES = ["low", "medium", "high"] as const;
export const PrioritySchema = z.enum(PRIORITIES);
export type Priority = z.infer<typeof PrioritySchema>;

/** Lifecycle stage for an AI task handed to the local agent. */
export const AI_TASK_STATUSES = ["queued", "running", "done", "failed"] as const;
export const AiTaskStatusSchema = z.enum(AI_TASK_STATUSES);
export type AiTaskStatus = z.infer<typeof AiTaskStatusSchema>;

// ---- Entities ----

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  /** Hex color used as the project's accent dot/label. */
  color: z.string(),
  created_at: z.string().datetime(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
});
export type Tag = z.infer<typeof TagSchema>;

export const ItemSchema = z.object({
  id: z.string().uuid(),
  type: ItemTypeSchema,
  status: ItemStatusSchema,
  priority: PrioritySchema,
  title: z.string().min(1),
  /** Markdown notes. Empty string when none. */
  notes: z.string(),
  /** Owning project, or null when unfiled. */
  project_id: z.string().uuid().nullable(),
  /** Free-form tag ids; may be empty. */
  tag_ids: z.array(z.string().uuid()),
  /** ISO date (no time) or null. */
  due_date: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Item = z.infer<typeof ItemSchema>;

export const AiTaskSchema = z.object({
  id: z.string().uuid(),
  item_id: z.string().uuid(),
  /** Which agent the task is intended for. */
  agent: z.string(),
  status: AiTaskStatusSchema,
  prompt: z.string(),
  /** Markdown result returned by the agent, or null until done. */
  result: z.string().nullable(),
  /** Failure reason, or null. */
  error: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type AiTask = z.infer<typeof AiTaskSchema>;

// ---- Input shapes (what the UI passes when creating/updating) ----

/** Fields a caller may set when creating an item. Everything else is defaulted. */
export const CreateItemInputSchema = ItemSchema.pick({
  title: true,
}).extend({
  type: ItemTypeSchema.optional(),
  status: ItemStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  notes: z.string().optional(),
  project_id: z.string().uuid().nullable().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
  due_date: z.string().nullable().optional(),
});
export type CreateItemInput = z.infer<typeof CreateItemInputSchema>;

/** Any subset of mutable item fields. */
export const UpdateItemInputSchema = ItemSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial();
export type UpdateItemInput = z.infer<typeof UpdateItemInputSchema>;
