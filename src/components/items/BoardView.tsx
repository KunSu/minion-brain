"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import {
  DueDate,
  PriorityChip,
  ProjectChip,
  TypeChip,
} from "./ItemChips";
import { ACTIVE_STATUSES, STATUS_META } from "@/lib/display";
import { cn } from "@/lib/utils";
import type { Item, ItemStatus, Project, Tag } from "@/lib/types";

/**
 * Kanban board. Columns are the active lifecycle stages (archived is hidden).
 * Dragging a card to another column changes its status via onStatusChange.
 */
export function BoardView({
  items,
  projects,
  onOpen,
  onStatusChange,
}: {
  items: Item[];
  projects: Project[];
  tags: Tag[];
  onOpen: (item: Item) => void;
  onStatusChange: (id: string, next: ItemStatus) => void;
}) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  );

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const id = String(active.id);
    const target = over.id as ItemStatus;
    const item = items.find((i) => i.id === id);
    if (item && item.status !== target) onStatusChange(id, target);
  }

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {ACTIVE_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            items={items.filter((i) => i.status === status)}
            projectById={projectById}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem && (
          <Card
            item={activeItem}
            project={
              activeItem.project_id ? projectById.get(activeItem.project_id) : undefined
            }
            overlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  items,
  projectById,
  onOpen,
}: {
  status: ItemStatus;
  items: Item[];
  projectById: Map<string, Project>;
  onOpen: (item: Item) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`} />
        <h2 className="text-sm font-semibold">{STATUS_META[status].label}</h2>
        <span className="text-xs text-muted">{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-32 flex-1 flex-col gap-2 rounded-2xl border border-dashed p-2 transition-colors",
          isOver ? "border-ring bg-accent-soft/40" : "border-border bg-surface/40",
        )}
      >
        {items.map((item) => (
          <DraggableCard
            key={item.id}
            item={item}
            project={item.project_id ? projectById.get(item.project_id) : undefined}
            onOpen={() => onOpen(item)}
          />
        ))}
        {items.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted/70">Drop here</p>
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  item,
  project,
  onOpen,
}: {
  item: Item;
  project: Project | undefined;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={cn("touch-none", isDragging && "opacity-30")}
    >
      <Card item={item} project={project} />
    </div>
  );
}

function Card({
  item,
  project,
  overlay,
}: {
  item: Item;
  project: Project | undefined;
  overlay?: boolean;
}) {
  const done = item.status === "done";
  return (
    <div
      className={cn(
        "cursor-grab rounded-xl border bg-surface p-3 shadow-sm active:cursor-grabbing",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      <p
        className={cn(
          "text-sm font-medium",
          done && "text-muted line-through decoration-muted/40",
        )}
      >
        {item.title}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <TypeChip type={item.type} />
        <PriorityChip priority={item.priority} />
        {project && <ProjectChip project={project} />}
        {item.due_date && <DueDate date={item.due_date} done={done} />}
      </div>
    </div>
  );
}
