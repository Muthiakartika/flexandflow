import PostCard from "@/components/cards/PostCard";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { packColumns } from "@/lib/masonry";
import BlogSidebar from "./BlogSidebar";
import Pagination from "./Pagination";
import type { Post } from "@/types";

/** Posts per page, matching the WordPress listing. */
export const POSTS_PER_PAGE = 6;

/** Shared layout for the blog listing and the category archives. */
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
  const columns = packColumns(visible);

  return (
    <section className="py-[80px]">
      <Container>
        {/* Sidebar sits on the left, as on the original. */}
        <div className="grid gap-12 lg:grid-cols-[minmax(0,300px)_1fr]">
          <BlogSidebar />

          <div>
            {visible.length ? (
              <div className="grid gap-[30px] sm:grid-cols-2">
                {columns.map((column, columnIndex) => (
                  <div key={columnIndex} className="flex flex-col gap-[30px]">
                    {column.map((post, i) => (
                      <Reveal key={post.slug} delay={i * 100}>
                        <PostCard post={post} />
                      </Reveal>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[16px]">{emptyMessage}</p>
            )}

            <Pagination current={page} total={totalPages} hrefFor={hrefFor} />
          </div>
        </div>
      </Container>
    </section>
  );
}
