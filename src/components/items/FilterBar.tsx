"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectSelect, type ProjectMutations } from "@/components/projects/ProjectSelect";
import { cn } from "@/lib/utils";
import { ITEM_STATUSES, ITEM_TYPES } from "@/lib/types";
import { STATUS_META, TYPE_META } from "@/lib/display";
import type { ItemStatus, ItemType, Project, Tag } from "@/lib/types";

export interface Filters {
  types: ItemType[];
  statuses: ItemStatus[];
  projectId: string | null;
  tagId: string | null;
}

export const EMPTY_FILTERS: Filters = {
  types: [],
  statuses: [],
  projectId: null,
  tagId: null,
};

export function countActive(f: Filters): number {
  return f.types.length + f.statuses.length + (f.projectId ? 1 : 0) + (f.tagId ? 1 : 0);
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

/**
 * Filter controls as discrete dropdowns — Type, Status, and Project — mirroring
 * the project picker. Multi-select for Type/Status; single-select for Project.
 */
export function FilterBar({
  filters,
  onChange,
  projects,
  tags,
  projectMutations,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  projects: Project[];
  tags: Tag[];
  projectMutations: ProjectMutations;
}) {
  const active = countActive(filters);
  const tag = tags.find((t) => t.id === filters.tagId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Type */}
      <MultiDropdown
        label="Type"
        count={filters.types.length}
        options={ITEM_TYPES.map((t) => ({
          value: t,
          label: TYPE_META[t].label,
          checked: filters.types.includes(t),
        }))}
        onToggle={(v) => onChange({ ...filters, types: toggle(filters.types, v as ItemType) })}
      />

      {/* Status */}
      <MultiDropdown
        label="Status"
        count={filters.statuses.length}
        options={ITEM_STATUSES.map((s) => ({
          value: s,
          label: STATUS_META[s].label,
          checked: filters.statuses.includes(s),
        }))}
        onToggle={(v) =>
          onChange({ ...filters, statuses: toggle(filters.statuses, v as ItemStatus) })
        }
      />

      {/* Project — same control as the item editor, with management */}
      <div className="w-44">
        <ProjectSelect
          value={filters.projectId}
          onChange={(projectId) => onChange({ ...filters, projectId })}
          projects={projects}
          mutations={projectMutations}
          noneLabel="All projects"
          triggerClassName="h-9"
        />
      </div>

      {tag && (
        <button
          onClick={() => onChange({ ...filters, tagId: null })}
          className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent hover:opacity-80"
        >
          #{tag.name} ✕
        </button>
      )}

      {active > 0 && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

function MultiDropdown({
  label,
  count,
  options,
  onToggle,
}: {
  label: string;
  count: number;
  options: { value: string; label: string; checked: boolean }[];
  onToggle: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-app border bg-surface px-3 text-sm",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          count > 0 && "border-ring text-accent",
        )}
      >
        {label}
        {count > 0 && (
          <span className="rounded-full bg-accent px-1.5 text-xs text-accent-foreground">
            {count}
          </span>
        )}
        <ChevronDown className="h-4 w-4 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={o.checked}
            onSelect={(e) => {
              e.preventDefault();
              onToggle(o.value);
            }}
          >
            {o.label}
            {o.checked && <Check className="ml-auto h-4 w-4 text-accent" />}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
