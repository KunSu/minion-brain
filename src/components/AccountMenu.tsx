"use client";

import { Cloud, Download, HardDrive } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { backendKind, store } from "@/lib/data";

/**
 * Header menu: shows the active backend and a JSON export (the in-app
 * counterpart to `minion export`). No auth in this deployment, so no sign-out.
 */
export function AccountMenu() {
  async function exportJson() {
    const dump = await store.exportAll();
    const blob = new Blob(
      [JSON.stringify({ ...dump, exported_at: new Date().toISOString() }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "minion-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const Icon = backendKind === "supabase" ? Cloud : HardDrive;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Menu">
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {backendKind === "supabase" ? "Synced to Supabase" : "Local (this browser)"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={exportJson}>
          <Download className="h-4 w-4" />
          Export backup (JSON)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
