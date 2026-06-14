/**
 * Display metadata for enums — labels, ordering, and Tailwind color classes.
 * Centralized so List, Board, badges, and filters stay visually consistent.
 */
import type { ItemStatus, ItemType, Priority } from "./types";
import { ITEM_STATUSES } from "./types";

export const STATUS_META: Record<
  ItemStatus,
  { label: string; dot: string; chip: string }
> = {
  inbox: { label: "Inbox", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-700" },
  active: { label: "Active", dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700" },
  in_progress: {
    label: "In Progress",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700",
  },
  blocked: { label: "Blocked", dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700" },
  pending_approval: {
    label: "Pending Approval",
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700",
  },
  done: { label: "Done", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
  archived: { label: "Archived", dot: "bg-slate-300", chip: "bg-slate-50 text-slate-500" },
};

/** Statuses shown as Kanban columns / active lifecycle (archived is hidden by default). */
export const ACTIVE_STATUSES = ITEM_STATUSES.filter((s) => s !== "archived");

export const TYPE_META: Record<ItemType, { label: string; emoji: string; chip: string }> = {
  idea: { label: "Idea", emoji: "💡", chip: "bg-violet-50 text-violet-700" },
  todo: { label: "Todo", emoji: "✓", chip: "bg-sky-50 text-sky-700" },
  topic: { label: "Topic", emoji: "🔬", chip: "bg-teal-50 text-teal-700" },
  feature: { label: "Feature", emoji: "🧩", chip: "bg-indigo-50 text-indigo-700" },
};

export const PRIORITY_META: Record<
  Priority,
  { label: string; chip: string; rank: number }
> = {
  high: { label: "High", chip: "bg-rose-50 text-rose-700", rank: 0 },
  medium: { label: "Medium", chip: "bg-amber-50 text-amber-700", rank: 1 },
  low: { label: "Low", chip: "bg-slate-100 text-slate-600", rank: 2 },
};
