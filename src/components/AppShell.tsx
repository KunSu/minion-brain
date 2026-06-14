"use client";

import * as React from "react";
import { Brain, LayoutGrid, List as ListIcon, Moon, Search, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore, applyFilter } from "@/hooks/useStore";
import { useTheme } from "@/hooks/useTheme";
import { useHydrated } from "@/hooks/useHydrated";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { AccountMenu } from "@/components/AccountMenu";
import { QuickCapture } from "@/components/capture/QuickCapture";
import { ListView } from "@/components/items/ListView";
import { BoardView } from "@/components/items/BoardView";
import { ItemDetail } from "@/components/items/ItemDetail";
import { CommandPalette } from "@/components/CommandPalette";
import {
  EMPTY_FILTERS,
  FilterBar,
  type Filters,
} from "@/components/items/FilterBar";

type View = "list" | "board";
const VIEW_KEY = "minion-brain:view";
const isView = (v: string): v is View => v === "list" || v === "board";

export function AppShell() {
  const {
    items,
    projects,
    tags,
    loading,
    createItem,
    updateItem,
    archiveItem,
    ensureTag,
    createProject,
    updateProject,
    deleteProject,
    updateTag,
    deleteTag,
    createAiTask,
    listAiTasks,
  } = useStore();

  const projectMutations = React.useMemo(
    () => ({
      onCreateProject: createProject,
      onUpdateProject: updateProject,
      onDeleteProject: deleteProject,
    }),
    [createProject, updateProject, deleteProject],
  );

  const { theme, toggle: toggleTheme } = useTheme();
  const hydrated = useHydrated();
  const [view, setView] = useLocalStorage<View>(VIEW_KEY, "list", isView);
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  const [openItemId, setOpenItemId] = React.useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [captureFocus, setCaptureFocus] = React.useState(0);

  // Global shortcuts: ⌘K palette, `c` to capture.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === "c" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setCaptureFocus((n) => n + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = React.useMemo(
    () =>
      applyFilter(items, {
        query,
        types: filters.types.length ? filters.types : undefined,
        statuses: filters.statuses.length ? filters.statuses : undefined,
        projectId: filters.projectId ?? undefined,
        tagId: filters.tagId ?? undefined,
      }),
    [items, query, filters],
  );

  const openItem = openItemId ? items.find((i) => i.id === openItemId) ?? null : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-28 pt-4 sm:px-6 sm:pb-10">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Brain className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold tracking-tight">Minion Brain</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden items-center gap-2 rounded-app border bg-surface px-3 py-2 text-sm text-muted hover:bg-accent-soft/50 sm:flex"
          >
            <Search className="h-4 w-4" />
            <span>Search…</span>
            <kbd className="rounded border bg-background px-1.5 text-xs">⌘K</kbd>
          </button>
          <ViewToggle view={view} onChange={setView} />
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
            suppressHydrationWarning
          >
            {hydrated && theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <AccountMenu />
        </div>
      </header>

      {/* Capture */}
      <QuickCapture onCreate={createItem} autoFocusKey={captureFocus} />

      {/* Search + filters */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title and notes…"
            className="pl-9"
            aria-label="Search"
          />
        </div>
        <FilterBar
          filters={filters}
          onChange={setFilters}
          projects={projects}
          tags={tags}
          projectMutations={projectMutations}
        />
      </div>

      {/* Content */}
      <main className="mt-5 flex-1">
        {loading ? (
          <LoadingState />
        ) : view === "list" ? (
          <ListView
            items={visible}
            projects={projects}
            tags={tags}
            onOpen={(i) => setOpenItemId(i.id)}
            onStatusChange={(id, next) => updateItem(id, { status: next })}
            onArchive={(id) => archiveItem(id)}
          />
        ) : (
          <BoardView
            items={visible}
            projects={projects}
            tags={tags}
            onOpen={(i) => setOpenItemId(i.id)}
            onStatusChange={(id, next) => updateItem(id, { status: next })}
          />
        )}
      </main>

      {/* Detail panel */}
      <ItemDetail
        item={openItem}
        projects={projects}
        tags={tags}
        onClose={() => setOpenItemId(null)}
        onUpdate={updateItem}
        onArchive={(id) => {
          archiveItem(id);
          setOpenItemId(null);
        }}
        onEnsureTag={ensureTag}
        onCreateProject={createProject}
        onUpdateProject={updateProject}
        onDeleteProject={deleteProject}
        onUpdateTag={updateTag}
        onDeleteTag={deleteTag}
        listAiTasks={listAiTasks}
        createAiTask={createAiTask}
      />

      {/* Command palette */}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={items.filter((i) => i.status !== "archived")}
        onOpenItem={(i) => setOpenItemId(i.id)}
        onCreate={createItem}
        onSetView={setView}
      />
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="flex items-center rounded-app border bg-surface p-0.5">
      {(
        [
          { v: "list" as const, icon: ListIcon, label: "List" },
          { v: "board" as const, icon: LayoutGrid, label: "Board" },
        ]
      ).map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            "flex items-center gap-1.5 rounded-[0.55rem] px-2.5 py-1.5 text-sm transition-colors",
            view === v ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground",
          )}
          aria-pressed={view === v}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl border bg-surface/60"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}
