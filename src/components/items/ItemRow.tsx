"use client";

import { Archive, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DueDate,
  PriorityChip,
  ProjectChip,
  TagChip,
  TypeChip,
} from "./ItemChips";
import { StatusDropdown } from "./StatusDropdown";
import { cn } from "@/lib/utils";
import type { Item, ItemStatus, Project, Tag } from "@/lib/types";

/** A single dense, scannable list row. */
export function ItemRow({
  item,
  project,
  tags,
  onOpen,
  onStatusChange,
  onArchive,
}: {
  item: Item;
  project: Project | undefined;
  tags: Tag[];
  onOpen: () => void;
  onStatusChange: (next: ItemStatus) => void;
  onArchive: () => void;
}) {
  const done = item.status === "done" || item.status === "archived";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-surface px-3 py-2.5",
        "cursor-pointer transition-colors hover:border-ring/60 hover:bg-accent-soft/30",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <StatusDropdown status={item.status} onChange={onStatusChange} compact />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-sm font-medium",
              done && "text-muted line-through decoration-muted/40",
            )}
          >
            {item.title}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <TypeChip type={item.type} />
          <PriorityChip priority={item.priority} />
          {project && <ProjectChip project={project} />}
          {tags.map((t) => (
            <TagChip key={t.id} tag={t} />
          ))}
          {item.due_date && <DueDate date={item.due_date} done={done} />}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={(e) => e.stopPropagation()}
          className="rounded-md p-1.5 text-muted opacity-0 transition-opacity hover:bg-accent-soft group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Item actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            onSelect={onArchive}
            className="text-rose-600 focus:bg-rose-50"
          >
            <Archive className="h-4 w-4" />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
