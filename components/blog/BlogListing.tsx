import PostCard from "@/components/cards/PostCard";
import { BAND, WRAP } from "@/components/ui/tokens";
import BlogSidebar from "./BlogSidebar";
import Pagination from "./Pagination";
import type { Post } from "@/types";

/** Posts per page, matching the WordPress listing. */
export const POSTS_PER_PAGE = 6;

/**
 * Blog listing: uniform cards in a plain grid rather than the theme's masonry.
 * The posts have wildly different image ratios, and packing them into columns
 * left the two sides of the page ending at different heights with no reading
 * order to speak of.
 */
export default function BlogListing({
  posts,
  page = 1,
  hrefFor,
  emptyMessage = "No posts found.",
}: {
  posts: Post[];
  page?: number;
  hrefFor: (page: number) => string;
  emptyMessage?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  const visible = posts.slice(
    (page - 1) * POSTS_PER_PAGE,
    page * POSTS_PER_PAGE,
  );

  return (
    <section className={`${WRAP} ${BAND}`}>
      <div className="grid gap-[clamp(1.75rem,3vw,3rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        <div>
          {visible.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {visible.map((post) => (
                <li key={post.slug}>
                  <PostCard post={post} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-body text-[15px]">{emptyMessage}</p>
          )}

          <Pagination current={page} total={totalPages} hrefFor={hrefFor} />
        </div>

        <BlogSidebar />
      </div>
    </section>
  );
}
