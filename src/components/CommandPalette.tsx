"use client";

import * as React from "react";
import { FilePlus2, LayoutGrid, List as ListIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TYPE_META } from "@/lib/display";
import { ITEM_TYPES } from "@/lib/types";
import type { CreateItemInput, Item } from "@/lib/types";

/**
 * ⌘K palette: jump to an item, create one of each type, or switch view.
 * Search filtering is handled by cmdk over the rendered item labels.
 */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  onOpenItem,
  onCreate,
  onSetView,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  onOpenItem: (item: Item) => void;
  onCreate: (input: CreateItemInput) => Promise<unknown> | void;
  onSetView: (view: "list" | "board") => void;
}) {
  const [query, setQuery] = React.useState("");

  function run(fn: () => void) {
    onOpenChange(false);
    setQuery("");
    fn();
  }

  const trimmed = query.trim();

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search items, or type to create…"
      />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        {trimmed && (
          <CommandGroup heading="Create">
            {ITEM_TYPES.map((t) => (
              <CommandItem
                key={t}
                value={`create ${t} ${trimmed}`}
                onSelect={() => run(() => onCreate({ title: trimmed, type: t }))}
              >
                <FilePlus2 className="h-4 w-4 text-muted" />
                New {TYPE_META[t].label.toLowerCase()}:{" "}
                <span className="font-medium">“{trimmed}”</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Items">
          {items.slice(0, 50).map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.title} ${item.notes}`}
              onSelect={() => run(() => onOpenItem(item))}
            >
              <span aria-hidden>{TYPE_META[item.type].emoji}</span>
              <span className="truncate">{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="View">
          <CommandItem value="view list" onSelect={() => run(() => onSetView("list"))}>
            <ListIcon className="h-4 w-4 text-muted" />
            Switch to List
          </CommandItem>
          <CommandItem value="view board" onSelect={() => run(() => onSetView("board"))}>
            <LayoutGrid className="h-4 w-4 text-muted" />
            Switch to Board
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
