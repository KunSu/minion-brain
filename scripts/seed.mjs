/**
 * Seed your Supabase project with starter data (mirrors src/lib/data/fixtures.ts).
 *
 *   node scripts/seed.mjs            # insert starter data
 *   node scripts/seed.mjs --reset    # delete all your rows first, then insert
 *
 * No auth: uses the public (publishable/anon) key directly; RLS policies grant it
 * access. --reset deletes ONLY Minion Brain's tables (brain_items/projects/tags/
 * ai_tasks) — never the shared little-minion tables.
 */
import { getSignedInClient } from "./lib/client.mjs";

const reset = process.argv.includes("--reset");

const projects = [
  { key: "mb", name: "Minion Brain", color: "#6366f1" },
  { key: "personal", name: "Personal", color: "#10b981" },
  { key: "reading", name: "Reading", color: "#f59e0b" },
];

const tags = ["research", "work", "quick-win", "someday"];

// Items reference projects/tags by key/name; ids are resolved after insert.
const items = [
  {
    type: "feature", status: "in_progress", priority: "high",
    title: "Voice capture on mobile",
    notes: "Mic button that turns speech into an item. Chrome-first, en/zh toggle.",
    project: "mb", tags: ["work"], due_date: "2026-06-20",
  },
  {
    type: "idea", status: "inbox", priority: "medium",
    title: "Weekly review ritual inside the app",
    notes: "Sunday prompt to triage the inbox and archive stale items.",
    project: "mb", tags: ["someday"], due_date: null,
  },
  {
    type: "topic", status: "active", priority: "medium",
    title: "How do CRDTs handle offline merge?",
    notes: "Read up before deciding whether offline sync is worth it.",
    project: "reading", tags: ["research"], due_date: null,
  },
  {
    type: "todo", status: "inbox", priority: "high",
    title: "Set up nightly minion export backup",
    notes: "Cron job once the CLI exists.",
    project: "mb", tags: ["quick-win"], due_date: "2026-06-15",
  },
  {
    type: "todo", status: "done", priority: "low",
    title: "Pick the accent color for the theme",
    notes: "Went with a calm indigo on white.",
    project: "personal", tags: [], due_date: null,
  },
  {
    type: "feature", status: "blocked", priority: "medium",
    title: "Send-to-AI button on each item",
    notes: "Blocked until the minion CLI queue exists (Phase 4).",
    project: "mb", tags: ["work"], due_date: null,
  },
];

async function main() {
  const sb = await getSignedInClient();

  if (reset) {
    console.log("Resetting Minion Brain rows…");
    // ai_tasks cascade from brain_items; delete children first regardless.
    for (const table of ["ai_tasks", "brain_items", "tags", "projects"]) {
      const { error } = await sb.from(table).delete().not("id", "is", null);
      if (error) throw error;
    }
  }

  const projectId = {};
  for (const p of projects) {
    const { data, error } = await sb
      .from("projects")
      .insert({ name: p.name, color: p.color })
      .select("id")
      .single();
    if (error) throw error;
    projectId[p.key] = data.id;
  }
  console.log(`Inserted ${projects.length} projects`);

  const tagId = {};
  for (const name of tags) {
    const { data, error } = await sb
      .from("tags")
      .insert({ name })
      .select("id")
      .single();
    if (error) throw error;
    tagId[name] = data.id;
  }
  console.log(`Inserted ${tags.length} tags`);

  for (const it of items) {
    const { error } = await sb.from("brain_items").insert({
      type: it.type,
      status: it.status,
      priority: it.priority,
      title: it.title,
      notes: it.notes,
      project_id: it.project ? projectId[it.project] : null,
      tag_ids: it.tags.map((t) => tagId[t]),
      due_date: it.due_date,
    });
    if (error) throw error;
  }
  console.log(`Inserted ${items.length} items`);
  console.log("\n✅ Seed complete.");
}

main().catch((err) => {
  console.error("\n❌ Seed failed:", err.message);
  process.exit(1);
});
