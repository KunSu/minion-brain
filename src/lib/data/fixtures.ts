/**
 * Seed fixtures — schema-shaped sample data used to bootstrap the local store on
 * first run, and reused verbatim as the Supabase seed in Phase 2.
 *
 * Ids and timestamps are hardcoded (not generated) so the seed is deterministic
 * and stable across reloads. They are valid UUIDs / ISO strings, matching the
 * data contract exactly.
 */
import type { AiTask, Item, Project, Tag } from "../types";

export const seedProjects: Project[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Minion Brain",
    color: "#6366f1",
    created_at: "2026-05-01T09:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Personal",
    color: "#10b981",
    created_at: "2026-05-01T09:00:00.000Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Reading",
    color: "#f59e0b",
    created_at: "2026-05-01T09:00:00.000Z",
  },
];

export const seedTags: Tag[] = [
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", name: "research" },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", name: "work" },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3", name: "quick-win" },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4", name: "someday" },
];

export const seedItems: Item[] = [
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
    type: "feature",
    status: "in_progress",
    priority: "high",
    title: "Voice capture on mobile",
    notes: "Mic button that turns speech into an item. Chrome-first, en/zh toggle.",
    project_id: "11111111-1111-4111-8111-111111111111",
    tag_ids: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2"],
    due_date: "2026-06-20",
    created_at: "2026-06-02T10:15:00.000Z",
    updated_at: "2026-06-09T14:30:00.000Z",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    type: "idea",
    status: "inbox",
    priority: "medium",
    title: "Weekly review ritual inside the app",
    notes: "Sunday prompt to triage the inbox and archive stale items.",
    project_id: "11111111-1111-4111-8111-111111111111",
    tag_ids: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4"],
    due_date: null,
    created_at: "2026-06-07T08:00:00.000Z",
    updated_at: "2026-06-07T08:00:00.000Z",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
    type: "topic",
    status: "active",
    priority: "medium",
    title: "How do CRDTs handle offline merge?",
    notes: "Read up before deciding whether offline sync is worth it. (Currently deferred.)",
    project_id: "33333333-3333-4333-8333-333333333333",
    tag_ids: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"],
    due_date: null,
    created_at: "2026-06-05T19:45:00.000Z",
    updated_at: "2026-06-06T11:20:00.000Z",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4",
    type: "todo",
    status: "inbox",
    priority: "high",
    title: "Set up nightly minion export backup",
    notes: "Cron job once the CLI exists.",
    project_id: "11111111-1111-4111-8111-111111111111",
    tag_ids: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3"],
    due_date: "2026-06-15",
    created_at: "2026-06-08T07:30:00.000Z",
    updated_at: "2026-06-08T07:30:00.000Z",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5",
    type: "todo",
    status: "done",
    priority: "low",
    title: "Pick the accent color for the theme",
    notes: "Went with a calm indigo on white.",
    project_id: "22222222-2222-4222-8222-222222222222",
    tag_ids: [],
    due_date: null,
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-04T16:10:00.000Z",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6",
    type: "feature",
    status: "blocked",
    priority: "medium",
    title: "Send-to-AI button on each item",
    notes: "Blocked until the minion CLI queue exists (Phase 4).",
    project_id: "11111111-1111-4111-8111-111111111111",
    tag_ids: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2"],
    due_date: null,
    created_at: "2026-06-03T09:00:00.000Z",
    updated_at: "2026-06-09T09:00:00.000Z",
  },
];

export const seedAiTasks: AiTask[] = [];
