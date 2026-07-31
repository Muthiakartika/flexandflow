import Link from "next/link";

import Container from "./Container";
import { assets } from "@/lib/site";

export type Crumb = { label: string; href?: string };

/**
 * Inner-page title band. Matches the theme's `main-title-section`: a yoga-class
 * photo behind a gradient that fades into the tertiary colour, with the title
 * and a breadcrumb trail centred over it.
 */
export default function PageHero({
  title,
  crumbs = [],
}: {
  title: string;
  /** Trail after "Home"; the last entry renders as the current page. */
  crumbs?: Crumb[];
}) {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${assets.pageHeroBackground}')` }}
      >
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(180deg, transparent 0%, var(--color-tertiary) 100%)",
          }}
        />
      </div>

      <Container className="page-hero-container relative">
        <h1 className="page-hero-title text-center">{title}</h1>

        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center justify-center gap-2 font-body text-[16px] leading-[1.625]"
        >
          <Link href="/" className="hover:text-primary">
            Home
          </Link>

          {crumbs.map((crumb, i) => (
            <span key={crumb.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-[14px] w-px bg-current opacity-45"
              />
              {crumb.href && i < crumbs.length - 1 ? (
                <Link href={crumb.href} className="hover:text-primary">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </Container>
    </div>
  );
}
