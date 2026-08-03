"use client";

import Link from "next/link";

import useIsActive from "./useIsActive";
import type { NavItem } from "@/lib/site";

/**
 * Primary navigation in the academy's voice: 14px sentence case at the body
 * weight, no tracking — the uppercase-and-tracked label read as heavier than
 * the pair of sites should. The current section is marked by a rule under the
 * word rather than the old theme's burst glyph.
 */
const linkClass =
  "relative flex items-center py-2 font-body text-[14px] leading-none " +
  "transition-colors duration-300 " +
  "after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left " +
  "after:scale-x-0 after:bg-current after:transition-transform after:duration-300 " +
  "hover:text-primary hover:after:scale-x-100 " +
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";

/**
 * Both flyouts — the plain Services list and the Academy mega panel — open on
 * hover and on keyboard focus, and are centred under their trigger.
 */
const panelClass =
  "invisible absolute top-full left-1/2 z-40 -translate-x-1/2 translate-y-3 " +
  "rounded-[12px] border border-secondary/10 bg-white opacity-0 " +
  "shadow-[0_18px_40px_-18px_rgba(0,0,0,0.35)] transition-all duration-300 " +
  "group-hover:visible group-hover:translate-y-2 group-hover:opacity-100 " +
  "group-focus-within:visible group-focus-within:translate-y-2 group-focus-within:opacity-100";

/**
 * Transparent strip covering the gap between a trigger and its panel, so the
 * pointer never leaves the item on the way down. A real element rather than a
 * `before:` utility — arbitrary `content-['']` does not emit reliably here.
 */
function HoverBridge({ as: Tag = "span" }: { as?: "span" | "li" }) {
  return <Tag aria-hidden className="absolute inset-x-0 -top-4 h-4" />;
}

/**
 * One row inside a dropdown or mega panel — internal or off-site. The row for
 * the page you are on keeps the hover surface and goes bold, so an open panel
 * says where you are without being pointed at.
 */
function PanelLink({ item }: { item: NavItem }) {
  const active = useIsActive()(item);

  const className =
    "block rounded-[8px] px-3 py-2.5 font-body text-[14px] leading-snug " +
    "transition-colors duration-300 hover:bg-cream hover:text-primary " +
    "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary " +
    (active ? "bg-cream font-bold text-primary" : "text-body-text");

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {item.label}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {item.label}
    </Link>
  );
}

export default function DesktopNav({ items }: { items: NavItem[] }) {
  const isActive = useIsActive();

  return (
    <nav aria-label="Primary">
      <ul className="flex items-center gap-7">
        {items.map((item) => {
          const active = isActive(item);
          const hasChildren = Boolean(item.children?.length);
          const mega = item.mega;

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
                    active
                      ? "font-bold text-primary after:scale-x-100"
                      : "text-body-text"
                  }`}
                >
                  {item.label}
                </Link>
              )}

              {hasChildren ? (
                <ul className={`${panelClass} w-[248px] p-2`}>
                  <HoverBridge as="li" />
                  {item.children!.map((child) => (
                    <li key={child.label}>
                      <PanelLink item={child} />
                    </li>
                  ))}
                </ul>
              ) : null}

              {mega ? (
                <div className={`${panelClass} w-[620px] p-6`}>
                  <HoverBridge />
                  <div className="grid grid-cols-3 gap-6">
                    {mega.groups.map((group) => (
                      <div key={group.title}>
                        <p className="font-body text-[12px] tracking-[0.14em] text-primary uppercase">
                          {group.title}
                        </p>
                        {group.note ? (
                          <p className="mt-1 mb-2 font-body text-[12px] text-muted">
                            {group.note}
                          </p>
                        ) : null}
                        <ul className="-mx-3">
                          {group.items.map((child) => (
                            <li key={child.label}>
                              <PanelLink item={child} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {mega.footer ? (
                    <div className="mt-4 border-t border-secondary/10 pt-4">
                      <a
                        href={mega.footer.href}
                        target={mega.footer.external ? "_blank" : undefined}
                        rel={
                          mega.footer.external ? "noopener noreferrer" : undefined
                        }
                        className="font-body text-[14px] transition-colors duration-300 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                      >
                        {mega.footer.label}
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
