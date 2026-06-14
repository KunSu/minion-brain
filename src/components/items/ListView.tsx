"use client";

import { Inbox } from "lucide-react";
import { ItemRow } from "./ItemRow";
import { ITEM_STATUSES } from "@/lib/types";
import { STATUS_META } from "@/lib/display";
import type { Item, ItemStatus, Project, Tag } from "@/lib/types";

/** Dense list grouped by lifecycle status. Empty groups are hidden. */
export function ListView({
  items,
  projects,
  tags,
  onOpen,
  onStatusChange,
  onArchive,
}: {
  items: Item[];
  projects: Project[];
  tags: Tag[];
  onOpen: (item: Item) => void;
  onStatusChange: (id: string, next: ItemStatus) => void;
  onArchive: (id: string) => void;
}) {
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const tagById = new Map(tags.map((t) => [t.id, t]));

  if (items.length === 0) return <EmptyState />;

  const groups = ITEM_STATUSES.map((status) => ({
    status,
    items: items.filter((i) => i.status === status),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.status}>
          <div className="mb-2 flex items-center gap-2 px-1">
            <span
              className={`h-2 w-2 rounded-full ${STATUS_META[group.status].dot}`}
            />
            <h2 className="text-sm font-semibold text-foreground">
              {STATUS_META[group.status].label}
            </h2>
            <span className="text-xs text-muted">{group.items.length}</span>
          </div>
          <div className="space-y-1.5">
            {group.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                project={item.project_id ? projectById.get(item.project_id) : undefined}
                tags={item.tag_ids
                  .map((id) => tagById.get(id))
                  .filter((t): t is Tag => Boolean(t))}
                onOpen={() => onOpen(item)}
                onStatusChange={(next) => onStatusChange(item.id, next)}
                onArchive={() => onArchive(item.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-surface/50 py-20 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Inbox className="h-6 w-6" />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">Nothing here yet</p>
      <p className="mt-1 text-sm text-muted">
        Capture your first idea using the bar above, or press{" "}
        <kbd className="rounded border bg-surface px-1.5 py-0.5 text-xs">c</kbd>.
      </p>
    </div>
  );
}
