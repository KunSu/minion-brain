"use client";

import * as React from "react";
import { Archive } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagChip } from "./ItemChips";
import { SendToAI } from "./SendToAI";
import { ProjectSelect, type ProjectMutations } from "@/components/projects/ProjectSelect";
import {
  ITEM_STATUSES,
  ITEM_TYPES,
  PRIORITIES,
} from "@/lib/types";
import { PRIORITY_META, STATUS_META, TYPE_META } from "@/lib/display";
import type {
  AiTask,
  Item,
  Project,
  Tag,
  UpdateItemInput,
} from "@/lib/types";

interface DetailExtraProps extends ProjectMutations {
  onUpdateTag: (id: string, patch: { name: string }) => Promise<unknown>;
  onDeleteTag: (id: string) => Promise<unknown>;
  listAiTasks: (itemId: string) => Promise<AiTask[]>;
  createAiTask: (input: { item_id: string; prompt: string }) => Promise<AiTask>;
}

/**
 * Centered modal editor for one item. Edits are committed on change (the store
 * is instant), keeping the dialog feeling live without a Save button.
 */
export function ItemDetail({
  item,
  projects,
  tags,
  onClose,
  onUpdate,
  onArchive,
  onEnsureTag,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onUpdateTag,
  onDeleteTag,
  listAiTasks,
  createAiTask,
}: {
  item: Item | null;
  projects: Project[];
  tags: Tag[];
  onClose: () => void;
  onUpdate: (id: string, patch: UpdateItemInput) => Promise<unknown> | void;
  onArchive: (id: string) => void;
  onEnsureTag: (name: string) => Promise<Tag>;
} & DetailExtraProps) {
  const open = item !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {item && (
        <DialogContent className="max-w-xl p-0 max-h-[88vh] overflow-hidden">
          <ItemDetailBody
            key={item.id}
            item={item}
            projects={projects}
            tags={tags}
            onUpdate={onUpdate}
            onArchive={onArchive}
            onEnsureTag={onEnsureTag}
            onCreateProject={onCreateProject}
            onUpdateProject={onUpdateProject}
            onDeleteProject={onDeleteProject}
            onUpdateTag={onUpdateTag}
            onDeleteTag={onDeleteTag}
            listAiTasks={listAiTasks}
            createAiTask={createAiTask}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function ItemDetailBody({
  item,
  projects,
  tags,
  onUpdate,
  onArchive,
  onEnsureTag,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onUpdateTag,
  onDeleteTag,
  listAiTasks,
  createAiTask,
}: {
  item: Item;
  projects: Project[];
  tags: Tag[];
  onUpdate: (id: string, patch: UpdateItemInput) => Promise<unknown> | void;
  onArchive: (id: string) => void;
  onEnsureTag: (name: string) => Promise<Tag>;
} & DetailExtraProps) {
  void onUpdateTag;
  void onDeleteTag;
  const [title, setTitle] = React.useState(item.title);
  const [notes, setNotes] = React.useState(item.notes);
  const [tagInput, setTagInput] = React.useState("");

  const itemTags = item.tag_ids
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => Boolean(t));

  function commitTitle() {
    const t = title.trim();
    if (t && t !== item.title) onUpdate(item.id, { title: t });
    else setTitle(item.title);
  }

  function commitNotes() {
    if (notes !== item.notes) onUpdate(item.id, { notes });
  }

  async function addTag() {
    const name = tagInput.trim().replace(/^#/, "");
    if (!name) return;
    setTagInput("");
    const tag = await onEnsureTag(name);
    if (!item.tag_ids.includes(tag.id)) {
      onUpdate(item.id, { tag_ids: [...item.tag_ids, tag.id] });
    }
  }

  function removeTag(id: string) {
    onUpdate(item.id, { tag_ids: item.tag_ids.filter((t) => t !== id) });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-5 pr-12">
        <DialogTitle className="sr-only">Edit item</DialogTitle>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="border-0 px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
          aria-label="Title"
        />
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <Select
              value={item.type}
              onValueChange={(v) => onUpdate(item.id, { type: v as Item["type"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_META[t].emoji} {TYPE_META[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Status">
            <Select
              value={item.status}
              onValueChange={(v) => onUpdate(item.id, { status: v as Item["status"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Priority">
            <Select
              value={item.priority}
              onValueChange={(v) =>
                onUpdate(item.id, { priority: v as Item["priority"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Project">
            <ProjectSelect
              value={item.project_id}
              onChange={(projectId) => onUpdate(item.id, { project_id: projectId })}
              projects={projects}
              mutations={{ onCreateProject, onUpdateProject, onDeleteProject }}
            />
          </Field>
        </div>

        <Field label="Due date">
          <Input
            type="date"
            value={item.due_date ?? ""}
            onChange={(e) =>
              onUpdate(item.id, { due_date: e.target.value || null })
            }
          />
        </Field>

        <Field label="Tags">
          <div className="flex flex-wrap items-center gap-1.5">
            {itemTags.map((t) => (
              <button
                key={t.id}
                onClick={() => removeTag(t.id)}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                title="Remove tag"
              >
                <TagChip tag={t} />
              </button>
            ))}
          </div>
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addTag();
              }
            }}
            placeholder="Add a tag and press Enter…"
            className="mt-2"
          />
        </Field>

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={commitNotes}
            placeholder="Markdown notes…"
            className="min-h-40"
          />
        </Field>

        <div className="border-t pt-5">
          <SendToAI item={item} listAiTasks={listAiTasks} createAiTask={createAiTask} />
        </div>
      </div>

      <div className="border-t px-6 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onArchive(item.id)}
          className="text-rose-600 hover:bg-rose-50"
        >
          <Archive className="h-4 w-4" />
          Archive
        </Button>
      </div>
    </div>
  );
}
