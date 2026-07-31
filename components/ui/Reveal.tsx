"use client";

import { useEffect, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Stagger in milliseconds, for cards revealed as a group. */
  delay?: number;
  className?: string;
  as?: ElementType;
};

/**
 * Fades content up as it scrolls into view, standing in for Elementor's
 * entrance animations (which toggle `.elementor-invisible` on intersection).
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    /* Reduced motion is handled by the `motion-reduce:` classes below, so the
       observer can stay unconditional. */
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`${
        shown ? "translate-y-0 opacity-100" : "translate-y-[30px] opacity-0"
      } transition-[opacity,transform] duration-[900ms] ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 ${className}`.trim()}
      style={shown && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
