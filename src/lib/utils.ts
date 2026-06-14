import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a UUID. Used by the local store so ids match the future DB shape. */
export function uuid(): string {
  return crypto.randomUUID();
}

/** Current time as an ISO string — the canonical timestamp format in our data contract. */
export function nowIso(): string {
  return new Date().toISOString();
}
