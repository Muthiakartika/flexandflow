import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import type { Post } from "@/types";

/**
 * Card used on the category archives (/uluwatu-bali, /injury-guide): a photo
 * with a black date badge pinned to its bottom-left corner, and a plain
 * left-aligned title below — no excerpt, no visible button (unlike the main
 * blog listing's cards).
 *
 * Posts with no featured image render instead as a tinted olive box holding
 * the date, title, and a "Read More" pill.
 */
export default function ArchivePostCard({ post }: { post: Post }) {
  const href = `/${post.category}/${post.slug}`;

  if (!post.image) {
    return (
      <article className="rounded-[var(--radius-2x)] bg-primary/15 p-[30px]">
        <time className="block text-[16px] text-black">{post.date}</time>
        <h4 className="mt-2 text-[33.6px] leading-[1.26] text-black">
          <Link href={href} className="transition-colors duration-300 hover:text-primary">
            {post.title}
          </Link>
        </h4>
        <ButtonLink href={href} variant="solid" className="mt-4">
          Read More
        </ButtonLink>
      </article>
    );
  }

  return (
    <article className="group">
      <Link href={href} className="relative block overflow-hidden rounded-[var(--radius-2x)]">
        <Image
          src={post.image}
          alt=""
          aria-hidden
          width={post.imageWidth ?? 1024}
          height={post.imageHeight ?? 621}
          sizes="(max-width: 767px) 90vw, 678px"
          className="h-auto w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-105"
        />

        <div className="absolute bottom-0 left-0 flex h-[65px] items-center bg-black px-[30px] font-body text-[16px] text-white">
          {post.date}
        </div>
      </Link>

      <div className="entry-title mt-10 pr-10">
        <h4 className="text-[33.6px] leading-[1.26] text-black">
          <Link href={href} className="transition-colors duration-300 hover:text-primary">
            {post.title}
          </Link>
        </h4>
      </div>
    </article>
  );
}
