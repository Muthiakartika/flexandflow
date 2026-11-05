"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BTN_SOLID } from "@/components/ui/tokens";
import { bookingCtaHref, bookingCtaProps } from "@/lib/site";

/**
 * The lowest price and the booking action, pinned to the bottom of the
 * screen on phones and tablets while someone reads a treatment page.
 *
 * It slides up once the hero has scrolled away (the hero has its own two
 * buttons, so the bar would only repeat them) and then stays to the end of
 * the page. The class on `<html>` pads the footer by the bar's height, so
 * the footer's wordmark ends above it, and lifts the scroll-to-top button
 * clear of it (`globals.css`).
 *
 * None from 1024px, where the header and its Book now stay on screen: one
 * strong booking button in view at a time, and quieter ones at the points
 * a reader decides (the hero, the prices, the end of the article).
 */
export default function StickyBookBar({ from }: { from: string | null }) {
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("has-book-bar");

    const observers: IntersectionObserver[] = [];
    const hero = document.querySelector("[data-hero]");
    if (hero) {
      const o = new IntersectionObserver(([entry]) =>
        setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      );
      o.observe(hero);
      observers.push(o);
    }

    return () => {
      observers.forEach((o) => o.disconnect());
      root.classList.remove("has-book-bar");
    };
  }, []);

  return (
    <div className={`sticky-book-bar${pastHero ? " is-shown" : ""}`}>
      <div className="sticky-book-bar-inner page-wrap flex items-center justify-between gap-4 py-3">
        {from ? (
          <p className="leading-none">
            <span className="page-label block">From</span>
            <span className="mt-1 block font-body text-[17px] font-bold tabular-nums">{from}</span>
          </p>
        ) : (
          <span />
        )}
        <Link href={bookingCtaHref} {...bookingCtaProps} className={BTN_SOLID}>
          Book Session
        </Link>
      </div>
    </div>
  );
}
