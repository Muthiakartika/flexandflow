"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * The scannable layout's grouped two-column list (`lib/seo/layouts.ts`), as
 * a numbered sequence of cards: a deck to swipe through on a phone, three
 * side by side on a wide screen (the switch is CSS, in `globals.css`).
 *
 * The native scrollbar is hidden and replaced by a counter, a progress line
 * that follows the scroll position and two arrows, so the deck reads as a
 * slider rather than a box that happens to overflow. The controls hide
 * themselves whenever nothing is left to scroll.
 */
export default function CardSlider({
  label,
  slides,
}: {
  /** Names the deck for screen readers: the section heading. */
  label: string;
  slides: { title: string; points: ReactNode[] }[];
}) {
  const track = useRef<HTMLOListElement>(null);
  const [state, setState] = useState({
    active: 0,
    progress: 0,
    atStart: true,
    atEnd: false,
    scrollable: true,
  });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const cards = [...el.children] as HTMLElement[];
    const origin = cards[0]?.offsetLeft ?? 0;
    const atEnd = el.scrollLeft >= max - 1;
    const nearest = cards.reduce(
      (best, card, i) =>
        Math.abs(card.offsetLeft - origin - el.scrollLeft) <
        Math.abs(cards[best].offsetLeft - origin - el.scrollLeft)
          ? i
          : best,
      0,
    );
    setState({
      active: atEnd ? cards.length - 1 : nearest,
      progress: max > 0 ? Math.min(1, el.scrollLeft / max) : 0,
      atStart: el.scrollLeft <= 1,
      atEnd,
      scrollable: max > 1,
    });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      el.removeEventListener("scroll", onScroll);
    };
  }, [measure]);

  function go(step: number) {
    const el = track.current;
    if (!el) return;
    const cards = [...el.children] as HTMLElement[];
    const target =
      cards[Math.max(0, Math.min(cards.length - 1, state.active + step))];
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollTo({
      left: target.offsetLeft - cards[0].offsetLeft,
      behavior: reduce ? "auto" : "smooth",
    });
  }

  const count = String(slides.length).padStart(2, "0");

  return (
    <div
      className="card-slider"
      style={{ "--n": slides.length, "--p": state.progress } as CSSProperties}
    >
      <ol ref={track} className="card-slider-track" aria-label={label}>
        {slides.map((slide, i) => (
          <li key={slide.title} className="card-slider-card">
            <div className="card-slider-step" aria-hidden>
              <span className="card-slider-num">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="card-slider-rule" />
            </div>
            <h3>{slide.title}</h3>
            <p className="card-slider-lead">{slide.points[0]}</p>
            {slide.points.slice(1).map((point, j) => (
              <p key={j} className="card-slider-note">
                {point}
              </p>
            ))}
          </li>
        ))}
      </ol>

      {state.scrollable ? (
        <div className="card-slider-pager">
          <span className="card-slider-count" aria-hidden>
            {String(state.active + 1).padStart(2, "0")}
            <span> / {count}</span>
          </span>
          <span className="card-slider-progress" aria-hidden>
            <span className="card-slider-thumb" />
          </span>
          <button
            type="button"
            className="card-slider-arrow"
            aria-label="Previous card"
            disabled={state.atStart}
            onClick={() => go(-1)}
          >
            <Chevron flip />
          </button>
          <button
            type="button"
            className="card-slider-arrow"
            aria-label="Next card"
            disabled={state.atEnd}
            onClick={() => go(1)}
          >
            <Chevron />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}
