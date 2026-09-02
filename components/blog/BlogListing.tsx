import { Suspense } from "react";

import { BAND, WRAP } from "@/components/ui/tokens";
import BlogSidebar from "./BlogSidebar";
import PostGrid from "./PostGrid";
import SearchableGrid from "./SearchableGrid";
import { listingHref, POSTS_PER_PAGE } from "./pagination-config";
import type { Post } from "@/types";

export { POSTS_PER_PAGE };

/**
 * Blog listing: uniform cards in a plain grid rather than the theme's masonry.
 * The posts have wildly different image ratios, and packing them into columns
 * left the two sides of the page ending at different heights with no reading
 * order to speak of.
 *
 * Two ways to draw the same grid, and the difference is only about caching.
 * The archives and the numbered pages know their slice on the server and
 * render it there. The blog index accepts a `?s=` keyword, which used to be
 * read from the page's `searchParams` and made the whole route dynamic; it now
 * passes `searchable` instead, and the filter runs in the browser behind a
 * `<Suspense>` boundary so the route stays prerendered. See `SearchableGrid`.
 */
export default function BlogListing({
  posts,
  page = 1,
  basePath = "/blog",
  emptyMessage = "No posts found.",
  searchable = false,
}: {
  posts: Post[];
  page?: number;
  /** Root of the listing; `listingHref` derives the numbered pages from it. */
  basePath?: string;
  emptyMessage?: string;
  /** Filter on the `?s=` query, client-side. Only the blog index wants this. */
  searchable?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  const visible = posts.slice(
    (page - 1) * POSTS_PER_PAGE,
    page * POSTS_PER_PAGE,
  );

  /* The unfiltered first page — what the build prerenders, what a crawler
     sees, and what the browser shows until the filter hydrates. Passing it as
     the fallback rather than a skeleton means a visitor with no `?s=` never
     sees the list flicker: the same markup is already there. */
  const unfiltered = (
    <PostGrid
      posts={visible}
      page={page}
      totalPages={totalPages}
      hrefFor={(target) => listingHref(basePath, target)}
      emptyMessage={emptyMessage}
    />
  );

  return (
    <section className={`${WRAP} ${BAND}`}>
      <div className="grid gap-[clamp(1.75rem,3vw,3rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        {searchable ? (
          <Suspense fallback={unfiltered}>
            <SearchableGrid
              posts={posts}
              basePath={basePath}
              emptyMessage={emptyMessage}
            />
          </Suspense>
        ) : (
          unfiltered
        )}

        <BlogSidebar />
      </div>
    </section>
  );
}
