"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Testimonial } from "@/components/academy/testimonial";
import type { Testimonial as TestimonialType } from "@/lib/academy";

/**
 * One quote at a time, advancing on its own.
 *
 * Slides are stacked in a single grid cell rather than positioned absolutely.
 * That way the container sizes itself to the TALLEST quote and the band never
 * changes height as it advances — with three quotes of different lengths,
 * absolute positioning would need a hard-coded height and a short quote would
 * leave a hole under it.
 *
 * Autoplay and accessibility
 * --------------------------
 * Content that moves by itself has to be stoppable (WCAG 2.2.2). Three things
 * cover that here:
 *   - `prefers-reduced-motion: reduce` disables autoplay outright. Read via
 *     useSyncExternalStore rather than useEffect + setState, which keeps the
 *     first paint correct and avoids the cascading render that a setState in
 *     an effect body causes.
 *   - Hovering pauses it, so a mouse user reading a long quote is not
 *     interrupted mid-sentence.
 *   - Focus anywhere inside pauses it, which is what makes it reachable by
 *     keyboard: tabbing to the previous/next button stops the rotation.
 *
 * There is deliberately no separate pause button — the reference design has
 * none. If a stricter reading of 2.2.2 is wanted later, add one rather than
 * removing the autoplay; the `paused` state already exists to drive it.
 *
 * `aria-live` is off while it rotates on its own, because announcing a new
 * quote every few seconds is noise. It switches to polite once the carousel
 * is paused — i.e. once a person is actually interacting with it — so manual
 * navigation IS announced.
 */
const INTERVAL_MS = 7000;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function TestimonialCarousel({ items }: { items: TestimonialType[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const prefersReducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    // The server has no media queries. Assuming "no preference" matches the
    // browser default; the real value arrives on hydration.
    () => false,
  );

  const count = items.length;
  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  useEffect(() => {
    if (paused || prefersReducedMotion || count < 2) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % count),
      INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [paused, prefersReducedMotion, count]);

  if (!count) return null;

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="What students say"
      className="flex flex-col items-center gap-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div aria-live={paused ? "polite" : "off"} className="grid w-full">
        {items.map((item, i) => {
          const active = i === index;
          return (
            <div
              key={item.name}
              // Every slide occupies the same grid cell, so the tallest sets
              // the height and nothing shifts between transitions.
              className={`col-start-1 row-start-1 transition-opacity duration-500 ${
                active ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-hidden={!active}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
            >
              <Testimonial item={item} align="center" />
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => go(index - 1)}
          // border-white/60, not /40: a control's own boundary needs 3:1
          // against its background (WCAG 1.4.11) and /40 measures 2.35:1 on
          // olive-dark. /60 clears it.
          className="flex size-11 items-center justify-center rounded-full border border-white/60 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <span className="sr-only">Previous testimonial</span>
          <span aria-hidden className="text-lg leading-none">
            ‹
          </span>
        </button>

        <ul className="flex items-center">
          {items.map((item, i) => (
            <li key={item.name}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === index}
                // The visible dot is 8px, but the button is a 44px target —
                // the padding does the work so the row still looks like dots.
                className="flex size-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span className="sr-only">
                  Go to testimonial {i + 1} of {count}
                </span>
                <span
                  aria-hidden
                  // The inactive dot still has to be findable, so it clears
                  // 3:1 too — /40 did not.
                  className={`size-2 rounded-full transition-colors ${
                    i === index ? "bg-white" : "bg-white/60"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => go(index + 1)}
          // border-white/60, not /40: a control's own boundary needs 3:1
          // against its background (WCAG 1.4.11) and /40 measures 2.35:1 on
          // olive-dark. /60 clears it.
          className="flex size-11 items-center justify-center rounded-full border border-white/60 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <span className="sr-only">Next testimonial</span>
          <span aria-hidden className="text-lg leading-none">
            ›
          </span>
        </button>
      </div>
    </div>
  );
}
