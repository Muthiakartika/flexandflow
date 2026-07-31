import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import type { Post } from "@/types";

/**
 * Blog listing card. The featured image keeps its intrinsic aspect ratio (the
 * listing is a masonry), the date sits above an uppercase title, and "Read More"
 * fades in over the image on hover — as on the original. Posts with no image
 * show the button inline instead.
 */
export default function PostCard({ post }: { post: Post }) {
  const href = `/${post.category}/${post.slug}`;

  if (!post.image) {
    return (
      <article className="flex flex-col rounded-[var(--radius-2x)] bg-primary/15 p-[30px] text-center">
        <div className="flex justify-center">
          <ButtonLink href={href} variant="solid">
            Read More
          </ButtonLink>
        </div>

        <time className="mt-6 font-body text-[16px] leading-[1.625] text-primary">
          {post.date}
        </time>

        <h4 className="mt-2 text-[33.6px] leading-[1.26] uppercase max-[767px]:text-[28px]">
          <Link href={href} className="transition-colors duration-300 hover:text-primary">
            {post.title}
          </Link>
        </h4>
      </article>
    );
  }

  return (
    <article className="group flex flex-col text-center">
      <div className="relative overflow-hidden rounded-[var(--radius-2x)]">
        <Link href={href} tabIndex={-1} aria-hidden>
          <Image
            src={post.image}
            alt={post.title}
            width={post.imageWidth ?? 1024}
            height={post.imageHeight ?? 621}
            sizes="(max-width: 767px) 90vw, 485px"
            className="h-auto w-full transition-transform duration-[600ms] ease-out group-hover:scale-105"
          />
        </Link>

        {/* Revealed on hover, matching the theme's `.entry-button` overlay. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/25 opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100">
          <ButtonLink href={href}>Read More</ButtonLink>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <time className="mt-6 font-body text-[16px] leading-[1.625] text-primary">
          {post.date}
        </time>

        <h4 className="mt-2 text-[33.6px] leading-[1.26] uppercase max-[767px]:text-[28px]">
          <Link
            href={href}
            className="transition-colors duration-300 hover:text-primary"
          >
            {post.title}
          </Link>
        </h4>
      </div>
    </article>
  );
}
