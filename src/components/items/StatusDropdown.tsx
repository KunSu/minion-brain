"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusChip } from "./ItemChips";
import { ITEM_STATUSES } from "@/lib/types";
import { STATUS_META } from "@/lib/display";
import { cn } from "@/lib/utils";
import type { ItemStatus } from "@/lib/types";

/** Inline control to advance an item through the lifecycle. */
export function StatusDropdown({
  status,
  onChange,
  compact = false,
}: {
  status: ItemStatus;
  onChange: (next: ItemStatus) => void;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "hover:opacity-80 transition-opacity",
        )}
        onClick={(e) => e.stopPropagation()}
        aria-label="Change status"
      >
        <StatusChip status={status} />
        {!compact && <ChevronDown className="h-3.5 w-3.5 text-muted" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {ITEM_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onSelect={() => onChange(s)}
            className={cn(s === status && "bg-accent-soft/60")}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s].dot)} />
            {STATUS_META[s].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
