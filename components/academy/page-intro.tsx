import type { ReactNode } from "react";

/**
 * Opener for the inner pages. Replaces the old PageHero, which carried an
 * optional full-width photograph — on a single-programme site those banners
 * repeated the same one or two images on every route and pushed the actual
 * content below the fold for no gain.
 */
export function PageIntro({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-line bg-paper">
      {/* Band tokens, matching Section — see app/globals.css. */}
      <div className="mx-auto max-w-6xl px-6 py-band sm:px-8 sm:py-band-wide">
        <div className="flex max-w-3xl flex-col gap-4">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display text-5xl sm:text-6xl">{title}</h1>
          {lead ? (
            <p className="text-base leading-relaxed text-muted sm:text-lg">
              {lead}
            </p>
          ) : null}
          {children ? <div className="mt-2">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
