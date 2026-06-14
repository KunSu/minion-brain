"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

/** Command palette dialog wrapper (cmdk + Radix Dialog). */
export function CommandDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-[20%] z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2",
            "overflow-hidden rounded-2xl border bg-surface shadow-xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <CommandPrimitive className="flex flex-col">{children}</CommandPrimitive>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function CommandInput(
  props: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>,
) {
  return (
    <div className="flex items-center gap-2 border-b px-4">
      <Search className="h-4 w-4 shrink-0 text-muted" />
      <CommandPrimitive.Input
        className={cn(
          "h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted/70",
        )}
        {...props}
      />
    </div>
  );
}

export function CommandList(
  props: React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>,
) {
  return (
    <CommandPrimitive.List
      className="max-h-80 overflow-y-auto overflow-x-hidden p-2"
      {...props}
    />
  );
}

export function CommandEmpty(
  props: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>,
) {
  return (
    <CommandPrimitive.Empty
      className="py-8 text-center text-sm text-muted"
      {...props}
    />
  );
}

export function CommandGroup(
  props: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>,
) {
  return (
    <CommandPrimitive.Group
      className="overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted"
      {...props}
    />
  );
}

export function CommandItem(
  props: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>,
) {
  return (
    <CommandPrimitive.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 text-sm",
        "data-[selected=true]:bg-accent-soft data-[selected=true]:text-foreground",
      )}
      {...props}
    />
  );
}
