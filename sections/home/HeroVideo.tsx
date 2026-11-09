"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * The home hero's studio footage over a still from the studio.
 *
 * The still is a real `<img>` in the HTML, fetched at high priority, and it
 * is the hero's largest paint for every visitor. The clip is started once the
 * page has finished loading, so its half megabyte does not compete with the
 * page's own photos and text on a phone, and it fades in over the still once
 * it is actually playing. Each width gets the clip cut to its own frame
 * (`assets` in `lib/site.ts`).
 *
 * Why not a still set after load: anything large painted late in this box
 * becomes the page's LCP, however late it arrives. The still used to be set
 * as the video's poster after `load` whenever the clip could not play, which
 * is what PageSpeed's headless Chromium hits; its mobile LCP was 3.8 s, and
 * 4.1–4.9 s locally with the clip blocked, against a still in the HTML.
 * A poster in the HTML is no better: it is fetched at low priority (3.5 s,
 * commit 995c7c1).
 *
 * Not played at all for a visitor who asks for less: data saver on, or
 * reduced motion. They keep the still.
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
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const start = () => {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      if (connection?.saveData || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      video.src = matchMedia("(min-width: 1024px)").matches ? wide : narrow;
      video.play().catch(() => {
        /* Autoplay refused (low-power mode, some in-app browsers): the still stays. */
      });
    };

    if (document.readyState === "complete") {
      start();
      return;
    }
    window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, [wide, narrow]);

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <Image
        src={still}
        alt=""
        aria-hidden
        fill
        loading="eager"
        fetchPriority="high"
        sizes="(min-width: 1024px) 46vw, 100vw"
        className="object-cover"
      />
      <video
        ref={ref}
        onPlaying={() => setPlaying(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${playing ? "opacity-100" : "opacity-0"}`}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden
      />
    </div>
  );
}
