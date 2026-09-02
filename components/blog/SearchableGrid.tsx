"use client";

import { useSearchParams } from "next/navigation";

import PostGrid from "./PostGrid";
import { listingHref, POSTS_PER_PAGE } from "./pagination-config";
import type { Post } from "@/types";

/**
 * The blog index's `?s=` keyword filter, moved off the server.
 *
 * It used to be four lines in `app/(main)/blog/page.tsx` reading the page's
 * `searchParams`. That is a dynamic API, so it opted the whole route out of
 * static rendering: `/blog` was the only marketing page in the build marked
 * `ƒ`, re-rendered on every request and impossible for any cache to hold
 * (`x-vercel-cache: MISS`, `Age: 0`, on a page whose content is identical for
 * everybody who is not searching).
 *
 * Reading the query here instead keeps the route prerendered. Next renders the
 * tree up to the enclosing `<Suspense>` at build time and hydrates only this
 * subtree in the browser — so the crawler and the first paint get the full
 * listing, and the filter applies the moment the bundle runs. `SearchForm`
 * still navigates to `/blog?s=…`, so the URL is unchanged and nothing that
 * links to it breaks.
 *
 * The whole post set arrives as a prop; there are a few dozen of them and they
 * are already in the payload for the unfiltered listing, so filtering costs no
 * extra request.
 */
export default function SearchableGrid({
  posts,
  basePath,
  emptyMessage,
}: {
  posts: Post[];
  basePath: string;
  emptyMessage: string;
}) {
  const keyword = useSearchParams().get("s")?.toLowerCase().trim();

  const filtered = keyword
    ? posts.filter((post) =>
        `${post.title} ${post.excerpt}`.toLowerCase().includes(keyword),
      )
    : posts;

  return (
    <PostGrid
      posts={filtered.slice(0, POSTS_PER_PAGE)}
      page={1}
      totalPages={Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE))}
      hrefFor={(target) => listingHref(basePath, target)}
      emptyMessage={
        keyword ? `No posts match “${keyword}”.` : emptyMessage
      }
    />
  );
}
