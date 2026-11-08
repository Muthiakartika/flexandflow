"use client";

import { useEffect, useRef } from "react";

import imageLoader from "@/lib/image-loader";

/**
 * The home hero's studio footage, started once the page has finished loading
 * rather than with it, so the clip's half megabyte does not compete with the
 * page's own photos and text on a phone. Each width gets the clip cut to its
 * own frame (`assets` in `lib/site.ts`).
 *
 * Not played at all for a visitor who asks for less: data saver on, or
 * reduced motion. They see a still from the studio instead, set after load
 * so it never counts as the page's largest paint (a poster loaded with the
 * page measured the home page's LCP at 3.5 s against 1.2 s).
 */
export default function HeroVideo({
  wide,
  narrow,
  still,
  className,
}: {
  wide: string;
  narrow: string;
  still: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const start = () => {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      if (connection?.saveData || matchMedia("(prefers-reduced-motion: reduce)").matches) {
        video.poster = imageLoader({ src: still, width: 828 });
        return;
      }
      video.src = matchMedia("(min-width: 1024px)").matches ? wide : narrow;
      video.play().catch(() => {
        /* Autoplay refused (low-power mode, some in-app browsers): show the still. */
        video.poster = imageLoader({ src: still, width: 828 });
      });
    };

    if (document.readyState === "complete") {
      start();
      return;
    }
    window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, [wide, narrow, still]);

  return <video ref={ref} className={className} muted loop playsInline preload="none" aria-hidden />;
}
