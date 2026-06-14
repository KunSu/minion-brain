import { format, isPast, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_META, STATUS_META, TYPE_META } from "@/lib/display";
import type { Item, Project, Tag } from "@/lib/types";

export function TypeChip({ type }: { type: Item["type"] }) {
  const m = TYPE_META[type];
  return (
    <Badge className={m.chip}>
      <span aria-hidden>{m.emoji}</span>
      {m.label}
    </Badge>
  );
}

export function StatusChip({ status }: { status: Item["status"] }) {
  const m = STATUS_META[status];
  return (
    <Badge className={m.chip}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} aria-hidden />
      {m.label}
    </Badge>
  );
}

export function PriorityChip({ priority }: { priority: Item["priority"] }) {
  const m = PRIORITY_META[priority];
  return <Badge className={m.chip}>{m.label}</Badge>;
}

export function ProjectChip({ project }: { project: Project }) {
  return (
    <Badge className="bg-slate-50 text-slate-600">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: project.color }}
        aria-hidden
      />
      {project.name}
    </Badge>
  );
}

export function TagChip({ tag }: { tag: Tag }) {
  return <Badge className="bg-slate-50 text-slate-500">#{tag.name}</Badge>;
}

export function DueDate({ date, done }: { date: string; done?: boolean }) {
  // `date` is a date-only string (e.g. "2026-06-20"). parseISO would treat it as
  // UTC midnight and shift the displayed day in negative-offset zones, so anchor
  // it to local time. Overdue compares against the END of the due day.
  const d = parseISO(`${date}T00:00:00`);
  const endOfDay = parseISO(`${date}T23:59:59`);
  const overdue = !done && isPast(endOfDay);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        overdue ? "text-rose-600" : "text-muted",
      )}
    >
      <CalendarDays className="h-3.5 w-3.5" />
      {format(d, "MMM d")}
    </span>
  );
}
