/**
 * `cn` — the class-name merger every shadcn/ui component expects to import.
 *
 * `clsx` resolves the conditionals; `tailwind-merge` then throws away the
 * losers among conflicting Tailwind utilities, so a `className` passed into a
 * component actually overrides the component's own class rather than racing it
 * on source order. That is the whole reason the call sites in this repo can
 * hand `components/ui/select.tsx` the admin's 8px corner or the main site's
 * 10px one and have it stick.
 *
 * Not `server-only`: shadcn components are client components, and this is the
 * one module all of them share.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
