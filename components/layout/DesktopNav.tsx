"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "@/lib/site";

/** True when `href` is the current page or an ancestor of it. */
function useIsActive() {
  const pathname = usePathname();

  return (item: NavItem) => {
    if (item.external) return false;
    if (item.href === "/") return pathname === "/";
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
    return (item.children ?? []).some(
      (child) => !child.external && pathname.startsWith(child.href),
    );
  };
}

/**
 * Primary navigation in the studio voice: small uppercase labels on wide
 * tracking, with the current section marked by a rule under the word rather
 * than the old theme's burst glyph.
 */
const linkClass =
  "relative flex items-center py-2 font-body text-[13px] leading-none " +
  "tracking-[0.14em] uppercase transition-colors duration-300 " +
  "after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left " +
  "after:scale-x-0 after:bg-current after:transition-transform after:duration-300 " +
  "hover:text-primary hover:after:scale-x-100 " +
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";

export default function DesktopNav({ items }: { items: NavItem[] }) {
  const isActive = useIsActive();

  return (
    <nav aria-label="Primary">
      <ul className="flex items-center gap-7">
        {items.map((item) => {
          const active = isActive(item);
          const hasChildren = Boolean(item.children?.length);

          return (
            <li key={item.label} className="group relative">
              {item.external ? (
                <a
                  href={item.href}
                  className={`${linkClass} text-body-text`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`${linkClass} ${
                    active ? "text-primary after:scale-x-100" : "text-body-text"
                  }`}
                >
                  {item.label}
                </Link>
              )}

              {hasChildren ? (
                <ul className="invisible absolute top-full left-1/2 z-40 w-[248px] -translate-x-1/2 translate-y-3 rounded-[12px] border border-secondary/10 bg-cream p-2 opacity-0 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.35)] transition-all duration-300 group-hover:visible group-hover:translate-y-2 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-2 group-focus-within:opacity-100">
                  {item.children!.map((child) => (
                    <li key={child.label}>
                      <Link
                        href={child.href}
                        className="block rounded-[8px] px-3 py-2.5 font-body text-[14px] leading-snug text-body-text transition-colors duration-300 hover:bg-white/70 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
