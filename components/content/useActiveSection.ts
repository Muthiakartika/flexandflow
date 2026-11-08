"use client";

import { useEffect, useState } from "react";

/**
 * The index of the section being read: the last of these headings (by id)
 * whose top has passed the upper third of the screen. Shared by the article's
 * two margins, "On this page" (`PageToc`) and the photos (`RailPhotos`), so
 * they always agree.
 */
export default function useActiveSection(ids: string[]): number {
  const [active, setActive] = useState(0);
  const key = ids.join(" ");

  useEffect(() => {
    const headings = key
      .split(" ")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (!headings.length) return;

    const pick = () => {
      const line = window.innerHeight * 0.33;
      let current = 0;
      headings.forEach((heading, i) => {
        if (heading.getBoundingClientRect().top <= line) current = i;
      });
      setActive(current);
    };
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(pick);
    };
    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [key]);

  return active;
}
