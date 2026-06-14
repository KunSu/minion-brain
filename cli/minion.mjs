#!/usr/bin/env node
/**
 * minion — the local CLI your AI agent (Claude Code / Codex) drives to work
 * tasks queued from the Minion Brain web app.
 *
 * It uses the public Supabase key (NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local).
 * This deployment has no auth; RLS policies grant the public key access to the
 * Minion Brain tables. The app/CLI only soft-delete (archive) — never hard-delete.
 *
 * Commands:
 *   minion next                       Claim & print the next queued task (FIFO), mark it running
 *   minion list                       List pending (queued + running) tasks
 *   minion add --title "" [--queue]   Create a brain_item (todo); --queue also queues an ai_task
 *   minion done <id> --result <file>  Attach a result file and mark the task done (idempotent)
 *   minion done <id> --result-text "" Attach inline result text
 *   minion fail <id> --error "msg"    Mark a task failed with a reason
 *   minion export [--out backup.json] Dump your entire brain to JSON (backup)
 *
 * Agentic flow: tell your agent "work on my next minion task" → it runs
 * `minion next`, does the work, then `minion done <id> --result out.md`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { getSignedInClient } from "../scripts/lib/client.mjs";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function printTask(t, item) {
  console.log(`\n  id:       ${t.id}`);
  console.log(`  status:   ${t.status}`);
  console.log(`  agent:    ${t.agent}`);
  console.log(`  created:  ${t.created_at}`);
  if (item) {
    console.log(`  item:     [${item.type}/${item.status}] ${item.title}`);
    if (item.notes) console.log(`  notes:    ${item.notes.replace(/\n/g, "\n            ")}`);
  }
  console.log(`\n  prompt:\n  ${t.prompt.replace(/\n/g, "\n  ")}\n`);
}

async function cmdNext(sb) {
  // FIFO: oldest queued task first.
  const { data: queued, error } = await sb
    .from("ai_tasks")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  if (!queued || queued.length === 0) {
    console.log("No queued tasks. You're all caught up. ✨");
    return;
  }
  const task = queued[0];
  // Claim it: flip to running so a second `next` won't pick it up.
  const { data: claimed, error: upErr } = await sb
    .from("ai_tasks")
    .update({ status: "running" })
    .eq("id", task.id)
    .eq("status", "queued") // guard against a race
    .select("*")
    .maybeSingle();
  if (upErr) throw upErr;
  if (!claimed) {
    console.log("That task was just claimed elsewhere. Run `minion next` again.");
    return;
  }
  const { data: item } = await sb
    .from("brain_items")
    .select("*")
    .eq("id", claimed.item_id)
    .maybeSingle();
  console.log("Claimed task (now running):");
  printTask(claimed, item);
  console.log(`When done:  minion done ${claimed.id} --result <file>`);
}

async function cmdAdd(sb) {
  const title = arg("--title");
  if (!title) {
    throw new Error(
      'Usage: minion add --title "..." [--type idea|todo|topic|feature] [--priority low|medium|high] ' +
        '[--notes "..."|--notes-file <f>] [--queue] [--prompt "..."|--prompt-file <f>] [--agent claude]',
    );
  }
  const type = arg("--type") ?? "todo";
  const priority = arg("--priority") ?? "medium";
  const notesFile = arg("--notes-file");
  const notes = notesFile ? readFileSync(notesFile, "utf8") : (arg("--notes") ?? "");
  const { data: item, error } = await sb
    .from("brain_items")
    .insert({ type, status: "inbox", priority, title, notes })
    .select("*")
    .single();
  if (error) throw error;
  console.log(`🧠 Created brain_item ${item.id}  [${item.type}/${item.status}/${item.priority}] ${item.title}`);

  if (process.argv.includes("--queue")) {
    const promptFile = arg("--prompt-file");
    const prompt = promptFile
      ? readFileSync(promptFile, "utf8")
      : (arg("--prompt") ?? (notes || title));
    const agent = arg("--agent") ?? "claude";
    const { data: task, error: tErr } = await sb
      .from("ai_tasks")
      .insert({ item_id: item.id, agent, status: "queued", prompt })
      .select("*")
      .single();
    if (tErr) throw tErr;
    console.log(`📨 Queued ai_task ${task.id} (agent: ${agent}) — picked up by \`minion next\`.`);
  } else {
    console.log("(no --queue: item sits in Inbox; add --queue to also create an AI task)");
  }
}

async function cmdList(sb) {
  const { data, error } = await sb
    .from("ai_tasks")
    .select("*")
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) {
    console.log("No pending tasks.");
    return;
  }
  console.log(`${data.length} pending task(s):`);
  for (const t of data) {
    console.log(`  • [${t.status}] ${t.id}  — ${t.prompt.slice(0, 60)}`);
  }
}

async function cmdDone(sb, id) {
  if (!id) throw new Error("Usage: minion done <id> --result <file> | --result-text <text>");
  // Idempotent: if already done, no-op.
  const { data: existing } = await sb.from("ai_tasks").select("*").eq("id", id).maybeSingle();
  if (!existing) throw new Error(`Task not found: ${id}`);
  if (existing.status === "done") {
    console.log("Task already done — nothing to do.");
    return;
  }
  if (existing.status === "failed") {
    throw new Error(`Task ${id} is failed; cannot mark done. Re-queue it first.`);
  }
  const file = arg("--result");
  const inline = arg("--result-text");
  const result = file ? readFileSync(file, "utf8") : inline ?? "";
  // Guard on the expected state so a re-run can't clobber a concurrently-changed task.
  const { data: updated, error } = await sb
    .from("ai_tasks")
    .update({ status: "done", result, error: null })
    .eq("id", id)
    .in("status", ["queued", "running"])
    .select("id");
  if (error) throw error;
  if (!updated || updated.length === 0) {
    console.log("Task was not in a completable state (no change).");
    return;
  }
  console.log(`✅ Task ${id} marked done (${result.length} chars of result).`);
}

async function cmdFail(sb, id) {
  if (!id) throw new Error('Usage: minion fail <id> --error "reason"');
  const reason = arg("--error") ?? "Unspecified failure";
  const { error } = await sb
    .from("ai_tasks")
    .update({ status: "failed", error: reason })
    .eq("id", id);
  if (error) throw error;
  console.log(`Task ${id} marked failed: ${reason}`);
}

async function cmdExport(sb) {
  const out = arg("--out") ?? "minion-backup.json";
  // Logical name → physical table (items is renamed to share the project).
  const tables = {
    items: "brain_items",
    projects: "projects",
    tags: "tags",
    ai_tasks: "ai_tasks",
  };
  const dump = {};
  for (const [key, table] of Object.entries(tables)) {
    const { data, error } = await sb.from(table).select("*");
    if (error) throw error;
    dump[key] = data ?? [];
  }
  dump.exported_at = new Date().toISOString();
  writeFileSync(out, JSON.stringify(dump, null, 2));
  console.log(
    `📦 Exported ${dump.items.length} items, ${dump.projects.length} projects, ` +
      `${dump.tags.length} tags, ${dump.ai_tasks.length} tasks → ${out}`,
  );
}

async function main() {
  const cmd = process.argv[2];
  const id = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : undefined;

  if (!cmd || cmd === "help" || cmd === "--help") {
    console.log(readFileSync(new URL(import.meta.url)).toString().split("\n").slice(1, 24).join("\n").replace(/^ \* ?/gm, ""));
    return;
  }

  const sb = await getSignedInClient();
  switch (cmd) {
    case "next": return cmdNext(sb);
    case "list": return cmdList(sb);
    case "add": return cmdAdd(sb);
    case "done": return cmdDone(sb, id);
    case "fail": return cmdFail(sb, id);
    case "export": return cmdExport(sb);
    default:
      throw new Error(`Unknown command: ${cmd}. Run \`minion help\`.`);
  }
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
