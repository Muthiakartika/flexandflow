"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/academy/button";
import { CONTACT, DISCIPLINES } from "@/lib/academy";

/**
 * SiteHeader.
 *
 * Carries the "this is still Flex & Flow" signal: the studio logo comes
 * first, "Academy" is a subordinate label beside it, and a link back to the
 * main site sits in the utility bar. Client component because the mobile
 * menu, the courses dropdown and active-link state all need state.
 */
const NAV = [
  { label: "Schedule", href: "/academy/schedule" },
  { label: "Materials", href: "/academy/materials" },
  { label: "FAQ", href: "/academy/faq" },
  { label: "Contact", href: "/academy/contact" },
];

/**
 * The dropdown is grouped by course type rather than listing six links flat,
 * because "online or onsite" is the question a visitor is actually holding —
 * the discipline they already know. Adding Value groups its mega-menu the
 * same way for the same reason.
 */
const GROUPS = [
  {
    type: "online" as const,
    title: "Online courses",
    note: "Self-paced · start today",
  },
  {
    type: "onsite" as const,
    title: "Onsite courses",
    note: "2 days · max 6 students",
  },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState(false);
  const coursesRef = useRef<HTMLDivElement>(null);
  const coursesButtonRef = useRef<HTMLButtonElement>(null);

  // The academy is mounted at /academy, so its own home is the exact match to
  // guard against — `startsWith` there would light up every academy page.
  const isActive = (href: string) =>
    href === "/academy" ? pathname === "/academy" : pathname.startsWith(href);

  // Menus close in the links' own onClick rather than in an effect keyed on
  // pathname: setState inside an effect body triggers a cascading render, and
  // the click is the actual event we care about anyway.
  const closeAll = () => {
    setOpen(false);
    setCourses(false);
  };

  // Escape closes the dropdown and puts focus back on the trigger, so a
  // keyboard user is not dumped at the top of the document. Pointer-down
  // outside closes it without stealing focus.
  useEffect(() => {
    if (!courses) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCourses(false);
      coursesButtonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!coursesRef.current?.contains(event.target as Node)) setCourses(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [courses]);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur">
      {/* Utility bar — the route back to the parent brand. Olive rather than
          ink so the only heavy band on the page reads as brand colour, not as
          a black bar; olive-dark keeps white text at 6.1:1 (AA), which the
          lighter --color-olive would not (3.7:1). */}
      <div className="bg-olive-dark text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-2 text-xs sm:px-8">
          <p>Uluwatu, Bali · Small-group training for therapists</p>
          <a
            href={CONTACT.mainSite}
            className="font-bold underline-offset-4 hover:underline"
          >
            ← Back to flexandflow.fit
          </a>
        </div>
      </div>

      <div className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4 sm:px-8">
          <Link
            href="/academy"
            className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive"
          >
            <Image
              src="/photos/logo.png"
              alt="Flex & Flow"
              width={48}
              height={48}
              preload
              className="h-11 w-11 rounded-full object-contain"
            />
            <span className="display text-2xl leading-none">
              Academy
              <span className="block font-sans text-[10px] font-bold tracking-[0.18em] text-faint uppercase">
                Flex &amp; Flow
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            <div className="relative" ref={coursesRef}>
              <button
                ref={coursesButtonRef}
                type="button"
                onClick={() => setCourses((value) => !value)}
                aria-expanded={courses}
                aria-controls="courses-menu"
                className={`flex items-center gap-1.5 text-sm transition-colors hover:text-olive ${
                  isActive("/academy/courses") ? "font-bold text-olive" : "text-ink"
                }`}
              >
                Courses
                <span
                  aria-hidden
                  className={`text-[0.6rem] transition-transform duration-200 ${
                    courses ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {courses ? (
                <div
                  id="courses-menu"
                  className="absolute top-full left-1/2 mt-4 w-[34rem] -translate-x-1/2 rounded-surface border border-line bg-white p-6 shadow-lg"
                >
                  <div className="grid grid-cols-2 gap-6">
                    {GROUPS.map((group) => (
                      <div key={group.type} className="flex flex-col gap-1">
                        <p className="eyebrow">{group.title}</p>
                        <p className="mb-2 text-xs text-muted">{group.note}</p>
                        {DISCIPLINES.map((discipline) => (
                          <Link
                            key={discipline.slug}
                            href={`/academy/courses/${discipline.slug}/${group.type}`}
                            onClick={closeAll}
                            className="-mx-2 rounded-lg px-2 py-2 text-sm hover:bg-paper hover:text-olive"
                          >
                            {discipline.shortTitle}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/academy/courses"
                    onClick={closeAll}
                    className="mt-4 block border-t border-line pt-4 text-sm font-bold hover:text-olive"
                  >
                    Compare everything →
                  </Link>
                </div>
              ) : null}
            </div>

            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors hover:text-olive ${
                  isActive(item.href) ? "font-bold text-olive" : "text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ButtonLink href="/academy/schedule" className="hidden sm:inline-flex">
              Book a seat
            </ButtonLink>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              // rounded-control, not rounded-pill: this is a button, so it
              // follows --radius-control with the rest of them.
              className="flex size-11 items-center justify-center rounded-control border-2 border-line lg:hidden"
            >
              <span className="sr-only">
                {open ? "Close menu" : "Open menu"}
              </span>
              <span aria-hidden className="text-lg leading-none">
                {open ? "✕" : "☰"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="max-h-[70vh] overflow-y-auto border-b border-line bg-white lg:hidden"
        >
          {/* No dropdown on mobile — a menu inside a menu is a tap too many.
              The same six links are simply nested under their group heading. */}
          <ul className="mx-auto flex max-w-6xl flex-col px-6 py-2 sm:px-8">
            {GROUPS.map((group) => (
              <li key={group.type} className="border-b border-line py-4">
                <p className="eyebrow">{group.title}</p>
                <p className="mt-1 text-xs text-muted">{group.note}</p>
                <ul className="mt-2 flex flex-col">
                  {DISCIPLINES.map((discipline) => (
                    <li key={discipline.slug}>
                      <Link
                        href={`/academy/courses/${discipline.slug}/${group.type}`}
                        onClick={closeAll}
                        className="block py-3 text-base"
                      >
                        {discipline.shortTitle}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}

            <li>
              <Link
                href="/academy/courses"
                onClick={closeAll}
                className={`block border-b border-line py-4 text-base ${
                  pathname === "/academy/courses" ? "font-bold text-olive" : ""
                }`}
              >
                Compare everything
              </Link>
            </li>

            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeAll}
                  className={`block border-b border-line py-4 text-base ${
                    isActive(item.href) ? "font-bold text-olive" : ""
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="py-4">
              <ButtonLink
                href="/academy/schedule"
                onClick={closeAll}
                className="flex w-full"
              >
                Book a seat
              </ButtonLink>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
