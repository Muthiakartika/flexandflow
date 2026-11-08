import Image from "next/image";
import Link from "next/link";

import { CARD, FOCUS } from "@/components/ui/tokens";
import { readMinutes } from "@/lib/reading";
import type { Post } from "@/types";

const ARROW = (
  <svg
    viewBox="0 0 24 24"
    aria-hidden
    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/**
 * Blog card, used by the listing and both category archives — the original had
 * two different cards for the same object, one with a hover-revealed "Read
 * More" button that was invisible on touch, the other with a black date badge.
 *
 * On a phone it is a row, a square photo beside the date, the reading time
 * and the title, so a list of guides reads as a list: full cards stacked ran
 * the blog to 5,000px for six posts. From 640px it is the photo card with
 * the excerpt. `feature` is the blog's latest guide, wide, photo beside text.
 *
 * Titles run at 24px here rather than the theme's 33.6px uppercase: at that
 * size in Amatic, a two-line headline dominated the card it belonged to.
 */
export default function PostCard({ post, feature = false }: { post: Post; feature?: boolean }) {
  const href = `/${post.category}/${post.slug}`;
  const meta = `${post.date} · ${readMinutes(post.body)} min read`;

  if (feature) {
    return (
      <article
        className={`group grid overflow-hidden ${CARD} transition-colors duration-300 hover:border-primary/45 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]`}
      >
        {post.image ? (
          <Link href={href} tabIndex={-1} aria-hidden className="block overflow-hidden">
            <Image
              src={post.image}
              alt=""
              width={post.imageWidth ?? 1024}
              height={post.imageHeight ?? 621}
              priority
              fetchPriority="high"
              sizes="(max-width: 767px) 92vw, 50vw"
              className="aspect-[16/10] h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.03] md:aspect-auto"
            />
          </Link>
        ) : null}
        <div className="flex flex-col justify-center p-5 md:p-8">
          <p className="page-label">Latest guide &middot; {meta}</p>
          <h3 className="mt-2 font-display text-[clamp(1.875rem,1.5rem+1.4vw,2.5rem)] leading-[1.05] font-bold">
            <Link href={href} className={`transition-colors duration-300 group-hover:text-primary ${FOCUS}`}>
              {post.title}
            </Link>
          </h3>
          <p className="mt-3 line-clamp-4 font-body text-[15px] leading-[1.65] text-body-text/70">
            {post.excerpt}
          </p>
          <p className="mt-5 flex items-center gap-2 font-body text-[14px] font-bold">
            Read the guide
            {ARROW}
          </p>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group grid h-full items-center gap-3 overflow-hidden p-3 ${post.image ? "grid-cols-[104px_minmax(0,1fr)]" : ""} ${CARD} transition-colors duration-300 hover:border-primary/45 sm:flex sm:flex-col sm:items-stretch sm:gap-0 sm:p-0`}
    >
      {post.image ? (
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden
          className="block overflow-hidden rounded-[8px] sm:rounded-none"
        >
          <Image
            src={post.image}
            alt=""
            width={post.imageWidth ?? 1024}
            height={post.imageHeight ?? 621}
            sizes="(max-width: 639px) 104px, (max-width: 1024px) 46vw, 30vw"
            className="aspect-square w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04] sm:aspect-[16/10]"
          />
        </Link>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col sm:p-4">
        <p className="page-label">{meta}</p>
        <h3 className="mt-1.5 font-display text-[21px] leading-[1.1] font-bold sm:mt-2 sm:text-[24px] sm:leading-[1.12]">
          <Link href={href} className={`transition-colors duration-300 group-hover:text-primary ${FOCUS}`}>
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 font-body text-[13px] leading-[1.6] text-body-text/65 max-sm:hidden">
          {post.excerpt}
        </p>
        <p className="mt-auto flex items-center gap-2 pt-4 font-body text-[13px] font-bold max-sm:hidden">
          Read more
          {ARROW}
        </p>
      </div>
    </article>
  );
}
