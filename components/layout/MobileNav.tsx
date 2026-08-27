"use client";

import Link from "next/link";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import useIsActive from "./useIsActive";
import { ButtonLink } from "@/components/ui/Button";
import { externalBookingUrl, contact, type NavItem } from "@/lib/site";

/**
 * Drawer navigation for viewports below 1281px, standing in for the theme's
 * slide-in side panel: the full menu, the WordPress booking CTA, and contact
 * details. The "Menu" label is hidden below 1024px, as on the original.
 */
export default function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const panelId = useId();
  const isActive = useIsActive();

  /* The drawer is portalled to <body>. It has to be: the header carries
     `backdrop-blur`, and a backdrop-filter makes its element the containing
     block for fixed descendants — left in place, the panel resolves `h-full`
     against the 76px header and opens as a clipped strip.

     `document` only exists after hydration, hence the client/server split. */
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

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

  const drawer = (
    <>
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
              /* A mega menu collapses to the same accordion here, keeping its
                 column titles as sub-headings. */
              const groups =
                item.mega?.groups ??
                (item.children?.length
                  ? [{ title: "", note: "", items: item.children }]
                  : []);
              const hasChildren = groups.length > 0;
              const isExpanded = expanded === item.label;
              /* Same cue as the header panel — olive bold on a surface — but
                 inverted: the drawer's own ground is cream, so the band that
                 lifts off it is white. The negative margin lets the band sit
                 wider than the text without moving the text. */
              const topClass =
                "-mx-2 block flex-1 rounded-[8px] px-2 py-3 font-body text-[16px] " +
                (isActive(item)
                  ? "bg-white font-bold text-primary"
                  : "text-body-text");

              return (
                <li
                  key={item.label}
                  className="border-b border-tertiary last:border-b-0"
                >
                  {/* py-1 keeps the active band clear of the row's divider
                      instead of sitting flush against it. */}
                  <div className="flex items-center justify-between py-1">
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={close}
                        className={topClass}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={close}
                        aria-current={isActive(item) ? "page" : undefined}
                        className={topClass}
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
                    <div className="pt-1 pb-4 pl-4">
                      {groups.map((group, index) => (
                        <div key={group.title || index} className={index ? "mt-5" : ""}>
                          {group.title ? (
                            <p className="font-body text-[12px] tracking-[0.14em] text-primary uppercase">
                              {group.title}
                            </p>
                          ) : null}
                          {group.note ? (
                            <p className="mb-1 font-body text-[12px] text-muted">
                              {group.note}
                            </p>
                          ) : null}
                          <ul className="flex flex-col gap-1">
                            {group.items.map((child) => {
                              const childClass =
                                "-mx-2 block rounded-[8px] px-2 py-2 font-body text-[15px] " +
                                "transition-colors duration-300 hover:text-primary " +
                                (isActive(child)
                                  ? "bg-white font-bold text-primary"
                                  : "text-body-text");

                              return (
                                <li key={child.label}>
                                  {child.external ? (
                                    <a
                                      href={child.href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={close}
                                      className={childClass}
                                    >
                                      {child.label}
                                    </a>
                                  ) : (
                                    <Link
                                      href={child.href}
                                      onClick={close}
                                      aria-current={
                                        isActive(child) ? "page" : undefined
                                      }
                                      className={childClass}
                                    >
                                      {child.label}
                                    </Link>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}

                      {item.mega?.footer ? (
                        <a
                          href={item.mega.footer.href}
                          target={item.mega.footer.external ? "_blank" : undefined}
                          rel={
                            item.mega.footer.external
                              ? "noopener noreferrer"
                              : undefined
                          }
                          onClick={close}
                          className="-mx-2 mt-2 block rounded-[8px] px-2 py-2 font-body text-[15px] text-body-text transition-colors duration-300 hover:text-primary"
                        >
                          {item.mega.footer.label}
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Absolute: booking.flexandflow.fit is a separate deployment, so
            `external` opens it in a new tab, same as the WordPress price list. */}
        <ButtonLink href={externalBookingUrl} external className="mt-8 w-full">
          Book Appointment
        </ButtonLink>

        <div className="mt-8 flex flex-col gap-2 font-body text-[15px]">
          <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">
            {contact.phone}
          </a>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
          <p className="text-body-text">{contact.address}</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls={panelId}
        className="relative flex items-center font-body text-[16px] text-body-text transition-colors duration-300 hover:text-primary"
      >
        {/* The bars are 18×16; this stretches the tap target to 42×40 without
            moving anything in the header row. */}
        <span aria-hidden className="absolute -inset-x-3 -inset-y-3" />
        <span aria-hidden className="flex w-[18px] flex-col gap-[5px]">
          <span className="h-[2px] w-full bg-current" />
          <span className="h-[2px] w-full bg-current" />
          <span className="h-[2px] w-full bg-current" />
        </span>
        <span className="sr-only">Menu</span>
      </button>

      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
