"use client";

import * as React from "react";
import { Bot, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AiTask, Item } from "@/lib/types";

const STATUS_VIEW: Record<
  AiTask["status"],
  { label: string; chip: string; icon: React.ComponentType<{ className?: string }> }
> = {
  queued: { label: "Queued", chip: "bg-slate-100 text-slate-700", icon: Clock },
  running: { label: "Running", chip: "bg-amber-50 text-amber-700", icon: Loader2 },
  done: { label: "Done", chip: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  failed: { label: "Failed", chip: "bg-rose-50 text-rose-700", icon: XCircle },
};

/**
 * Queue an AI task against an item and view the task history/results. Tasks are
 * executed by the local `minion` CLI (run by you), which writes results back.
 * Use "Refresh" to pull the latest after the agent runs.
 */
export function SendToAI({
  item,
  listAiTasks,
  createAiTask,
}: {
  item: Item;
  listAiTasks: (itemId: string) => Promise<AiTask[]>;
  createAiTask: (input: { item_id: string; prompt: string }) => Promise<AiTask>;
}) {
  const [tasks, setTasks] = React.useState<AiTask[]>([]);
  const [prompt, setPrompt] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(() => {
    listAiTasks(item.id).then(setTasks);
  }, [item.id, listAiTasks]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function send() {
    const p = prompt.trim();
    if (!p) return;
    setBusy(true);
    await createAiTask({ item_id: item.id, prompt: p });
    setPrompt("");
    setBusy(false);
    refresh();
  }

  const defaultPrompt = `Help me with this ${item.type}: "${item.title}".`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <Bot className="h-3.5 w-3.5" /> Send to AI
        </span>
        {tasks.length > 0 && (
          <button
            onClick={refresh}
            className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            Refresh
          </button>
        )}
      </div>

      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={defaultPrompt}
        className="min-h-20 text-sm"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">Runs via your local `minion` CLI.</p>
        <Button size="sm" onClick={send} disabled={busy || !prompt.trim()}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Queue task
        </Button>
      </div>

      {tasks.length > 0 && (
        <ul className="space-y-2 pt-1">
          {tasks.map((t) => {
            const v = STATUS_VIEW[t.status];
            const Icon = v.icon;
            return (
              <li key={t.id} className="rounded-xl border bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-2 text-sm">{t.prompt}</p>
                  <Badge className={cn("shrink-0", v.chip)}>
                    <Icon className={cn("h-3 w-3", t.status === "running" && "animate-spin")} />
                    {v.label}
                  </Badge>
                </div>
                {t.result && (
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-accent-soft/40 p-2 text-xs">
                    {t.result}
                  </pre>
                )}
                {t.error && <p className="mt-2 text-xs text-rose-600">{t.error}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
