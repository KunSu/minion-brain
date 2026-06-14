"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Project } from "@/lib/types";
import type { ProjectMutations } from "./ProjectSelect";

const PALETTE = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#0ea5e9", "#8b5cf6", "#ec4899", "#14b8a6",
];

/**
 * Add / rename / recolor / delete projects. Deleting a project unlinks it from
 * items (handled by the store) rather than deleting them.
 */
export function ManageProjectsDialog({
  open,
  onOpenChange,
  projects,
  mutations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  mutations: ProjectMutations;
}) {
  const [newName, setNewName] = React.useState("");
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage projects</DialogTitle>
          <DialogDescription>
            Rename, recolor, or delete. Deleting keeps your items — they just lose the project.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-2">
          {projects.length === 0 && (
            <p className="py-4 text-center text-sm text-muted">No projects yet.</p>
          )}
          {projects.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <ColorDot
                color={p.color}
                onPick={(color) => mutations.onUpdateProject(p.id, { color })}
              />
              <Input
                defaultValue={p.name}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== p.name) mutations.onUpdateProject(p.id, { name });
                }}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                className="h-9"
              />
              {confirmId === p.id ? (
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-600 hover:bg-rose-50"
                    onClick={async () => {
                      await mutations.onDeleteProject(p.id);
                      setConfirmId(null);
                    }}
                  >
                    Delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-muted hover:text-rose-600"
                  onClick={() => setConfirmId(p.id)}
                  aria-label={`Delete ${p.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t pt-4">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const name = newName.trim();
                if (name) {
                  mutations.onCreateProject({ name });
                  setNewName("");
                }
              }
            }}
            placeholder="New project name…"
            className="h-9"
          />
          <Button
            size="sm"
            onClick={() => {
              const name = newName.trim();
              if (name) {
                mutations.onCreateProject({ name });
                setNewName("");
              }
            }}
            disabled={!newName.trim()}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ColorDot({ color, onPick }: { color: string; onPick: (c: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-6 w-6 rounded-full border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ backgroundColor: color }}
        aria-label="Change color"
      />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-20 grid grid-cols-4 gap-1 rounded-lg border bg-surface p-2 shadow-lg">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
                className="h-5 w-5 rounded-full border"
                style={{ backgroundColor: c }}
                aria-label={`Use ${c}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
