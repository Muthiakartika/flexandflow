import Image from "next/image";
import Link from "next/link";

import { CARD, FOCUS } from "@/components/ui/tokens";
import type { Post } from "@/types";

const categoryLabels: Record<Post["category"], string> = {
  "uluwatu-bali": "Uluwatu Bali",
  "injury-guide": "Injury Guide",
};

/**
 * Blog card, used by the listing and both category archives — the original had
 * two different cards for the same object, one with a hover-revealed "Read
 * More" button that was invisible on touch, the other with a black date badge.
 *
 * Titles run at 24px here rather than the theme's 33.6px uppercase: at that
 * size in Amatic, a two-line headline dominated the card it belonged to.
 */
export default function PostCard({ post }: { post: Post }) {
  const href = `/${post.category}/${post.slug}`;

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden ${CARD} transition-colors duration-300 hover:border-primary/45`}
    >
      {post.image ? (
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden
          className="block overflow-hidden"
        >
          <Image
            src={post.image}
            alt=""
            width={post.imageWidth ?? 1024}
            height={post.imageHeight ?? 621}
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
            className="aspect-[16/10] w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04]"
          />
        </Link>
      ) : null}

      <div className="flex flex-1 flex-col p-4">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <time className="page-label">{post.date}</time>
          <span aria-hidden className="page-label">
            ·
          </span>
          <Link
            href={`/${post.category}`}
            className={`page-label transition-colors duration-300 hover:text-primary ${FOCUS}`}
          >
            {categoryLabels[post.category]}
          </Link>
        </p>

        <h3 className="mt-2 font-display text-[24px] leading-[1.12] font-bold">
          <Link
            href={href}
            className={`transition-colors duration-300 group-hover:text-primary ${FOCUS}`}
          >
            {post.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-3 font-body text-[13px] leading-[1.6] text-body-text/65">
          {post.excerpt}
        </p>

        <p className="mt-auto flex items-center gap-2 pt-4 font-body text-[13px] font-bold">
          Read more
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
        </p>
      </div>
    </article>
  );
}
