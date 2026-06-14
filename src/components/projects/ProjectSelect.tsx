"use client";

import * as React from "react";
import { Check, ChevronDown, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ManageProjectsDialog } from "./ManageProjectsDialog";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

export interface ProjectMutations {
  onCreateProject: (input: { name: string; color?: string }) => Promise<Project>;
  onUpdateProject: (id: string, patch: { name?: string; color?: string }) => Promise<unknown>;
  onDeleteProject: (id: string) => Promise<unknown>;
}

/**
 * Project picker with inline management. Selecting sets the value; the footer
 * offers quick "New project" and "Manage projects…" (rename/recolor/delete).
 * `value === null` means "No project". Used in the item editor and as a filter.
 */
export function ProjectSelect({
  value,
  onChange,
  projects,
  mutations,
  allowNone = true,
  noneLabel = "No project",
  triggerClassName,
}: {
  value: string | null;
  onChange: (projectId: string | null) => void;
  projects: Project[];
  mutations: ProjectMutations;
  allowNone?: boolean;
  noneLabel?: string;
  triggerClassName?: string;
}) {
  const [adding, setAdding] = React.useState(false);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");

  const selected = projects.find((p) => p.id === value) ?? null;

  async function addProject() {
    const name = newName.trim();
    if (!name) return;
    const project = await mutations.onCreateProject({ name });
    setNewName("");
    setAdding(false);
    onChange(project.id);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-app border bg-surface px-3 py-2 text-sm",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            triggerClassName,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selected ? (
              <>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: selected.color }}
                />
                {selected.name}
              </>
            ) : (
              <span className="text-muted">{noneLabel}</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          {allowNone && (
            <DropdownMenuItem onSelect={() => onChange(null)}>
              <span className="h-2.5 w-2.5 rounded-full border" />
              {noneLabel}
              {value === null && <Check className="ml-auto h-4 w-4 text-accent" />}
            </DropdownMenuItem>
          )}
          {projects.map((p) => (
            <DropdownMenuItem key={p.id} onSelect={() => onChange(p.id)}>
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="truncate">{p.name}</span>
              {value === p.id && <Check className="ml-auto h-4 w-4 text-accent" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {adding ? (
            <div className="p-1">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addProject();
                  } else if (e.key === "Escape") {
                    setAdding(false);
                    setNewName("");
                  }
                }}
                placeholder="Project name…"
                className="h-8 w-full rounded-md border bg-surface px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          ) : (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setAdding(true);
              }}
            >
              <Plus className="h-4 w-4 text-muted" />
              New project
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setManageOpen(true)}>
            <Settings2 className="h-4 w-4 text-muted" />
            Manage projects…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ManageProjectsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        projects={projects}
        mutations={mutations}
      />
    </>
  );
}

/** Small re-export used by ManageProjectsDialog row buttons. */
export const ProjectRowIcons = { Pencil, Trash2 };
