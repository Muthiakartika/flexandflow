"use client";

import { useEffect, useState } from "react";

/**
 * The header's `<header>` element, with the two states the bar takes as the
 * page scrolls (`.site-header` in `globals.css`):
 *
 * - `data-scrolled` once the page has moved: the bar slims down and the
 *   tagline under the name folds away.
 * - `data-hidden` while scrolling down past the first screen, below 1024px:
 *   the bar slides up out of the way and comes back the moment the reader
 *   scrolls up. On a phone the treatment pages already keep a booking bar
 *   at the bottom, and two pinned bars left little room for the page.
 */
export default function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;

    const update = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      if (y < 160) setHidden(false);
      else if (y > last + 6) setHidden(true);
      else if (y < last - 6) setHidden(false);
      last = y;
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      data-hidden={hidden}
      className="site-header sticky top-0 z-40 border-b border-secondary/10 bg-white/95 backdrop-blur-md"
    >
      {children}
    </header>
  );
}
