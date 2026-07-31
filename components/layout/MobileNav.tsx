"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { contact, wordpressUrls, type NavItem } from "@/lib/site";

/**
 * Drawer navigation for viewports below 1281px, standing in for the theme's
 * slide-in side panel: the full menu, the WordPress booking CTA, and contact
 * details. The "Menu" label is hidden below 1024px, as on the original.
 */
export default function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const panelId = useId();

  /* Any link tap dismisses the drawer, so it never lingers after navigating. */
  const close = () => setOpen(false);

  /* Lock scrolling and allow Escape to dismiss while the drawer is open. */
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex items-center font-body text-[16px] text-body-text transition-colors duration-300 hover:text-primary"
      >
        <span aria-hidden className="flex w-[18px] flex-col gap-[5px]">
          <span className="h-[2px] w-full bg-current" />
          <span className="h-[2px] w-full bg-current" />
          <span className="h-[2px] w-full bg-current" />
        </span>
        <span className="sr-only">Menu</span>
      </button>

      {/* Backdrop */}
      <div
        onClick={close}
        aria-hidden
        className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />

      <div
        id={panelId}
        role="dialog"
        aria-modal={open}
        aria-label="Site menu"
        className="fixed top-0 right-0 z-50 flex h-full w-[320px] max-w-[85vw] flex-col overflow-y-auto bg-cream p-8 shadow-2xl"
        style={{
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 350ms ease-in-out",
        }}
      >
        <button
          type="button"
          onClick={close}
          className="self-end font-body text-[14px] tracking-wide text-body-text uppercase transition-colors duration-300 hover:text-primary"
        >
          Close
        </button>

        <nav aria-label="Primary" className="mt-6">
          <ul className="flex flex-col">
            {items.map((item) => {
              const hasChildren = Boolean(item.children?.length);
              const isExpanded = expanded === item.label;

              return (
                <li
                  key={item.label}
                  className="border-b border-tertiary last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={close}
                        className="block flex-1 py-3 font-body text-[16px] text-body-text"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={close}
                        className="block flex-1 py-3 font-body text-[16px] text-body-text"
                      >
                        {item.label}
                      </Link>
                    )}

                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => setExpanded(isExpanded ? null : item.label)}
                        aria-expanded={isExpanded}
                        aria-label={`Toggle ${item.label} submenu`}
                        className="p-3 text-primary"
                      >
                        <span
                          aria-hidden
                          className={`block transition-transform duration-300 ${
                            isExpanded ? "rotate-45" : ""
                          }`}
                        >
                          <span className="relative block h-4 w-4">
                            <span className="absolute top-1/2 left-0 h-[2px] w-4 -translate-y-1/2 bg-current" />
                            <span className="absolute top-0 left-1/2 h-4 w-[2px] -translate-x-1/2 bg-current" />
                          </span>
                        </span>
                      </button>
                    ) : null}
                  </div>

                  {hasChildren && isExpanded ? (
                    <ul className="pb-3 pl-4">
                      {item.children!.map((child) => (
                        <li key={child.label}>
                          <Link
                            href={child.href}
                            onClick={close}
                            className="block py-2 font-body text-[15px] text-body-text transition-colors duration-300 hover:text-primary"
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

        <ButtonLink
          href={wordpressUrls.booking}
          external
          className="mt-8 w-full"
        >
          Book Appointment
        </ButtonLink>

        <div className="mt-8 flex flex-col gap-2 font-body text-[15px]">
          <a href={contact.phoneHref}>{contact.phone}</a>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
          <p className="text-body-text">{contact.address}</p>
        </div>
      </div>
    </>
  );
}
