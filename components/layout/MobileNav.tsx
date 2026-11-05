"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import OpenStatus from "./OpenStatus";
import useIsActive from "./useIsActive";
import { Social, socialLinks } from "@/components/ui/Social";
import { BTN_GHOST, BTN_SOLID, FOCUS } from "@/components/ui/tokens";
import {
  bookingCtaHref,
  bookingCtaProps,
  contact,
  siteConfig,
  slideMenuServices,
  studioMapsUrl,
  type NavItem,
} from "@/lib/site";

/* Photos for the treatment row under Services, by path. The slide menu's
   list covers most; the two it leaves out are added here. */
const treatmentPhotos = new Map<string, string>([
  ...slideMenuServices.map((s) => [s.href, s.image] as [string, string]),
  ["/uluwatu-bali/lymphatic-detox-massage-for-men", "/images/2025/11/Lymphatic-Detox-Massage-for-Men.jpg"],
  ["/uluwatu-bali/pregnancy-massage-service", "/images/2026/06/Pregnancy-Massage.jpg"],
]);

/**
 * Navigation below 1281px: a full-screen menu on a phone, a 440px panel from
 * the right on a tablet.
 *
 * It opens like a page of its own rather than a list in a drawer: the
 * links in the display face at heading size, numbered, each sliding in a
 * beat after the last; Services opening into a swipeable row of treatment
 * photos; and a booking card at the foot with the studio's live open/closed
 * line (`OpenStatus`), the two ways to book and the contact details.
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
      {/* Backdrop, for the tablet panel; a phone's menu covers it. */}
      <div
        onClick={close}
        aria-hidden
        className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
      />

      <div
        id={panelId}
        role="dialog"
        aria-modal={open}
        aria-label="Site menu"
        inert={!open}
        data-open={open}
        className="mobile-menu fixed top-0 right-0 z-50 flex h-full w-full flex-col bg-cream sm:w-[440px]"
      >
        {/* ── Top bar, matching the header's height ───────────────────── */}
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-secondary/10 px-5">
          <Link href="/" onClick={close} aria-label={siteConfig.name} className={`rounded-full ${FOCUS}`}>
            <Image src={siteConfig.logo} alt={siteConfig.name} width={96} height={96} sizes="44px" className="h-11 w-11" />
          </Link>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className={`grid h-11 w-11 place-items-center rounded-full border border-primary/40 text-primary transition-colors duration-300 hover:bg-primary hover:text-white ${FOCUS}`}
          >
            <span aria-hidden className="relative block h-4 w-4 rotate-45">
              <span className="absolute top-1/2 left-0 h-[2px] w-4 -translate-y-1/2 bg-current" />
              <span className="absolute top-0 left-1/2 h-4 w-[2px] -translate-x-1/2 bg-current" />
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-8">
          <nav aria-label="Primary">
            <ol className="flex flex-col">
              {items.map((item, n) => {
                /* A mega menu collapses to the same accordion here, keeping
                   its column titles as sub-headings. */
                const groups =
                  item.mega?.groups ??
                  (item.children?.length ? [{ title: "", note: "", items: item.children }] : []);
                const hasChildren = groups.length > 0;
                const isExpanded = expanded === item.label;
                const active = isActive(item);
                const withPhotos = groups.every((g) => g.items.every((c) => treatmentPhotos.has(c.href)));
                const linkClass = `mobile-menu-link ${active ? "is-active" : ""} ${FOCUS}`;

                return (
                  <li
                    key={item.label}
                    className="mobile-menu-item border-b border-secondary/10"
                    style={{ "--i": n } as CSSProperties}
                  >
                    <div className="flex items-center gap-3 py-2.5">
                      <span aria-hidden className="mobile-menu-num">
                        {String(n + 1).padStart(2, "0")}
                      </span>
                      {hasChildren ? (
                        /* A row with a list under it opens the list wherever
                           it is tapped, which is what a thumb expects: the
                           name used to be a link to the landing page and only
                           the small + opened the list. The landing page is
                           still one tap away, at the foot of the list. */
                        <button
                          type="button"
                          onClick={() => setExpanded(isExpanded ? null : item.label)}
                          aria-expanded={isExpanded}
                          aria-controls={`${panelId}-${n}`}
                          className={`group flex min-w-0 flex-1 items-center gap-3 rounded-[6px] text-left ${FOCUS}`}
                        >
                          <span className={`mobile-menu-link ${active ? "is-active" : ""}`}>{item.label}</span>
                          <span
                            aria-hidden
                            className={`ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${
                              isExpanded
                                ? "border-primary bg-primary text-white"
                                : "border-primary/40 text-primary group-hover:border-primary"
                            }`}
                          >
                            <span
                              className={`relative block h-3.5 w-3.5 transition-transform duration-300 ${isExpanded ? "rotate-45" : ""}`}
                            >
                              <span className="absolute top-1/2 left-0 h-[2px] w-3.5 -translate-y-1/2 bg-current" />
                              <span className="absolute top-0 left-1/2 h-3.5 w-[2px] -translate-x-1/2 bg-current" />
                            </span>
                          </span>
                        </button>
                      ) : item.external ? (
                        <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={close} className={linkClass}>
                          {item.label}
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={close}
                          aria-current={active ? "page" : undefined}
                          className={linkClass}
                        >
                          {item.label}
                        </Link>
                      )}
                    </div>

                    {hasChildren && isExpanded ? (
                      <div id={`${panelId}-${n}`} className="pb-4">
                        {withPhotos ? (
                          /* Treatments as a swipeable row of photos. */
                          <ul className="mobile-menu-photos">
                            {groups.flatMap((g) => g.items).map((child) => (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  onClick={close}
                                  aria-current={isActive(child) ? "page" : undefined}
                                  className={`group block ${FOCUS} rounded-[10px]`}
                                >
                                  <span className="block overflow-hidden rounded-[10px]">
                                    <Image
                                      src={treatmentPhotos.get(child.href)!}
                                      alt=""
                                      width={280}
                                      height={210}
                                      sizes="140px"
                                      className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                                    />
                                  </span>
                                  <span
                                    className={`mt-2 block font-body text-[13px] leading-snug ${
                                      isActive(child) ? "font-bold text-primary" : "text-body-text"
                                    }`}
                                  >
                                    {child.label}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          groups.map((group, index) => (
                            <div key={group.title || index} className={index ? "mt-4" : ""}>
                              {group.title ? <p className="page-label">{group.title}</p> : null}
                              <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
                                {group.items.map((child) => (
                                  <li key={child.label}>
                                    <Link
                                      href={child.href}
                                      onClick={close}
                                      className={`block py-1.5 font-body text-[14px] transition-colors duration-300 hover:text-primary ${FOCUS}`}
                                    >
                                      {child.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))
                        )}
                        <Link
                          href={item.mega?.footer?.href ?? item.href}
                          onClick={close}
                          className={`mt-3 inline-block font-body text-[14px] text-primary ${FOCUS}`}
                        >
                          {item.mega?.footer?.label ?? `All ${item.label.toLowerCase()} & rates →`}
                        </Link>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* ── Book ───────────────────────────────────────────────────── */}
          <div
            className="mobile-menu-item mt-7 rounded-[10px] border border-secondary/10 bg-white p-5"
            style={{ "--i": items.length } as CSSProperties}
          >
            <OpenStatus />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link href={bookingCtaHref} {...bookingCtaProps} onClick={close} className={BTN_SOLID}>
                Book Session
              </Link>
              <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer" className={BTN_GHOST}>
                WhatsApp
              </a>
            </div>
          </div>

          <div
            className="mobile-menu-item mt-6 flex flex-col gap-1.5 font-body text-[14px] text-body-text/70"
            style={{ "--i": items.length + 1 } as CSSProperties}
          >
            <a href={studioMapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
              {contact.shortAddress} &rarr;
            </a>
            <a href={`mailto:${contact.email}`} className="hover:text-primary">
              {contact.email}
            </a>
            <ul className="mt-3 flex items-center gap-4">
              {socialLinks.map((social) => (
                <li key={social.href}>
                  <Social {...social} variant="bare" />
                </li>
              ))}
            </ul>
          </div>
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
        className={`grid h-11 w-11 place-items-center rounded-full border border-primary/40 text-body-text transition-colors duration-300 hover:border-primary hover:text-primary ${FOCUS}`}
      >
        {/* Round, like the menu's own close button in the same spot, so
            opening and closing read as one control. Two bars, the lower one
            shorter. */}
        <span aria-hidden className="flex w-[18px] flex-col items-end gap-[5px]">
          <span className="h-[2px] w-full rounded-full bg-current" />
          <span className="h-[2px] w-3 rounded-full bg-current" />
        </span>
        <span className="sr-only">Menu</span>
      </button>

      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
