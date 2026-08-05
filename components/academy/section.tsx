import type { ReactNode } from "react";

/**
 * Component 2 of 10 — Section and SectionHeader.
 *
 * Owns the page's vertical rhythm and reading width so no page hand-rolls
 * padding. Bands alternate white and paper, matching the main site.
 */
export function Section({
  children,
  tone = "white",
  size = "md",
  className = "",
  id,
}: {
  children: ReactNode;
  tone?: "white" | "paper" | "olive";
  size?: "md" | "lg";
  className?: string;
  id?: string;
}) {
  // The heavy band is olive, not black, matching the header's utility bar.
  // olive-dark rather than --color-olive: white on the lighter olive is only
  // 3.7:1, under AA. Anything placed on this tone has far less headroom than
  // it had on black — see the `light` notes in SectionHeader below.
  const tones = {
    white: "bg-white text-ink",
    paper: "bg-paper text-ink",
    olive: "bg-olive-dark text-white",
  };
  // Band padding comes from the spacing tokens in app/globals.css, not from
  // literal py-16/py-20 values. Change the rhythm there — the comment block
  // above the tokens explains why every value shows up doubled on screen.
  const sizes = {
    md: "py-band sm:py-band-wide",
    lg: "py-band-wide sm:py-band-feature",
  };

  return (
    <section id={id} className={`${tones[tone]} ${sizes[size]} ${className}`}>
      <div className="mx-auto w-full max-w-6xl px-6 sm:px-8">{children}</div>
    </section>
  );
}

/**
 * Eyebrow + title + lead. `align` centres it for full-width bands; the
 * default left alignment suits editorial two-column layouts.
 */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  align = "left",
  tone = "dark",
  className = "",
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  tone?: "dark" | "light";
  className?: string;
  /** Optional trailing content, e.g. a "view all" link. */
  children?: ReactNode;
}) {
  const centered = align === "center";
  return (
    <div
      className={`flex flex-col gap-4 ${
        centered ? "items-center text-center" : ""
      } ${className}`}
    >
      {/* `light` is for the olive band. The old white/70 and white/75 were
          sized for black (10:1) and drop to 3.9:1 and 4.3:1 on olive, both
          under AA — hence solid white here and /85 (4.95:1) on the lead. */}
      {eyebrow ? (
        <p className={tone === "light" ? "eyebrow text-white" : "eyebrow"}>
          {eyebrow}
        </p>
      ) : null}
      {/* max-w-3xl for both alignments now, where the left variant used to be
          max-w-2xl. At the lg size of 60px, "Why two days in the room is worth
          it." needs 674px on one line and 2xl caps at 672 — it wrapped by two
          pixels. 3xl (768px) clears it, and no heading on the site is long
          enough for the extra width to produce an over-long measure. */}
      <h2 className="display max-w-3xl text-4xl sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      {lead ? (
        <p
          className={`max-w-2xl text-base leading-relaxed sm:text-lg ${
            tone === "light" ? "text-white/85" : "text-muted"
          }`}
        >
          {lead}
        </p>
      ) : null}
      {children}
    </div>
  );
}
