"use client";

import { usePathname } from "next/navigation";

import type { NavItem } from "@/lib/site";

/**
 * True when the item is the current page or an ancestor of it. Shared by both
 * navigations so the header and the drawer always agree on what is current.
 */
export default function useIsActive() {
  const pathname = usePathname();

  const matches = (item: NavItem) => {
    if (item.external) return false;
    if (item.href === "/") return pathname === "/";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (item: NavItem) => {
    if (matches(item)) return true;

    /* A parent is current while any of its children is. Mega-menu entries are
       all off-site, so they never mark anything. */
    return (item.children ?? []).some(matches);
  };
}
